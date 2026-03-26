import 'dotenv/config'
import {TavilySearch} from '@langchain/tavily'
import {HumanMessage} from '@langchain/core/messages'
import {ChatDeepSeek} from '@langchain/deepseek'
import {GraphRecursionError, MessagesAnnotation, StateGraph} from '@langchain/langgraph'
import {ToolNode} from '@langchain/langgraph/prebuilt'
import {buildSystemMessage, FileMemory} from "./file-memory";
import {toolsTextMapper} from "../../utils/tools-text-mapper";
import {fileTools} from "./tools/FileTools";


// 2. 定义工具集
const tools = [
    new TavilySearch({
        maxResults: 3,
        tavilyApiKey: "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",
        country: "china",
        description: `
### 搜索工具使用限制（重要） ###
1. 你正在使用 TavilySearch 工具进行联网搜索。
2. **次数限制**：针对用户的同一个搜索需求，你最多只能尝试调用 TavilySearch 工具 **3次**。
3. **失败处理**：
   - 如果 TavilySearch 连续 **3次** 调用失败、报错或返回空结果，**请立即停止调用该工具**。
   - 此时请直接回复用户：“抱歉，搜索服务暂时无法获取有效信息，请您检查网络或换个关键词再试。”
4. **禁止死循环**：不要在第 4 次尝试调用 TavilySearch，否则会导致系统崩溃。
`,
    }),
    ...fileTools
]

// 3. 定义模型
const model = new ChatDeepSeek({
    model: 'deepseek-chat',
    temperature: 0,
    apiKey: "sk-b73cc7906dbf4a238fa5658eec9e2eda"
}).bindTools(tools)

// 4. 创建工具节点
const toolNode = new ToolNode(tools)


// 文件记忆实例
const memoryMap = new Map();

function getMemory(sessionId) {
    let isCreated = false
    if (!memoryMap.has(sessionId)) {
        memoryMap.set(sessionId, new FileMemory({
            historyFile: './chat_history.json',
            sessionId: sessionId
        }));
        isCreated = true;
    }
    return {
        memory: memoryMap.get(sessionId),
        isCreated
    };
}

export async function getSessionMemory(sessionId) {
    const memory = getMemory(sessionId).memory;
    const memoryVars = await memory.loadMemoryVariables();
    return memoryVars.chat_history || [];
}

// 5. 定义调用模型的函数
async function callModel(state, config) {
    console.log("正在调用模型，当前消息数:", state.messages.length, "sessionId", config.configurable.sessionId);
    const sessionId = config.configurable.sessionId;
    const memory = getMemory(sessionId).memory;

    // 加载历史记录
    const memoryVars = await memory.loadMemoryVariables();
    const history = memoryVars.chat_history || [];

    // 构建包含历史记录的消息数组
    const messages = [buildSystemMessage(history), ...state.messages];

    const response = await model.invoke(messages)

    let finalContent = "";
    if (response.content) {
        finalContent = response.content;
    }
    if (response.tool_calls) {

        finalContent += toolsTextMapper(response.tool_calls);
    }

    await memory.saveContext({
        outputs: {response: finalContent}
    });

    return {messages: [response]}
}

// 6. 定义继续或结束的判断函数
function shouldContinue({messages}) {
    const lastMessage = messages[messages.length - 1]

    if (lastMessage.tool_calls?.length) {
        console.log("需要调用工具:", lastMessage.tool_calls.map(tc => tc.name))
        return 'tools'
    }
    return '__end__'
}

// 7. 创建工作流
const workflow = new StateGraph(MessagesAnnotation)
    .addNode('agent', callModel)
    .addNode('tools', toolNode)
    .addEdge('__start__', 'agent')
    .addConditionalEdges('agent', shouldContinue)
    .addEdge('tools', 'agent')  // 关键：工具执行后回到agent

const app = workflow.compile()

// 8. 优化后的 callLLM 函数 - 保留 stream 方式
async function callLLM(sessionId, message, onProgress) {
    const {memory, isCreated} = getMemory(sessionId);
    await memory.saveContext({
        inputs: {input: message},
    });
    if (isCreated) {
        onProgress({
            type: 'create-memory',
            sessionId,
        })
    }

    try {
        // 使用 stream 执行，但正确处理状态
        const stream = await app.stream({
            messages: [new HumanMessage(message)],
        }, {
            recursionLimit: 50,
            configurable: {
                sessionId
            }
        })

        const finalAnswer = execStream(sessionId, stream, message, onProgress)
        return finalAnswer || "未获取到有效响应"
    } catch (e) {
        console.error(e)
        return "错误"
    }

}

// 修改 execStream 函数
async function execStream(sessionId, stream, message, onProgress) {
    let finalAnswer = null
    let lastStep = null

    try {
        // 遍历每个执行步骤
        for await (const step of stream) {
            console.log('执行步骤:', Object.keys(step))
            lastStep = step

            // 发送步骤信息
            if (onProgress) {
                onProgress({
                    sessionId,
                    type: 'step',
                    stepName: Object.keys(step)[0],
                    data: step, // 注意：大对象序列化可能会慢，生产环境建议精简
                    timestamp: Date.now()
                })
            }

            // 处理 agent 节点
            if (step.agent) {
                const llmResponse = step.agent.messages[0]

                // 发送 LLM 响应（可能是中间响应）
                if (onProgress) {
                    onProgress({
                        sessionId,
                        type: 'llm_response',
                        content: llmResponse.content,
                        tool_calls: llmResponse.tool_calls,
                        timestamp: Date.now()
                    })
                }

                // 检查是否是最终回复 (没有工具调用且有内容)
                if (!llmResponse.tool_calls?.length && llmResponse.content) {
                    finalAnswer = llmResponse.content
                    // 发送最终答案
                    if (onProgress) {
                        onProgress({
                            sessionId,
                            type: 'final_answer',
                            content: finalAnswer,
                            timestamp: Date.now()
                        })
                    }
                }
                // 如果有工具调用，发送中间状态
                else if (llmResponse.tool_calls?.length) {
                    if (onProgress) {
                        onProgress({
                            sessionId,
                            type: 'tool_calls',
                            tool_calls: llmResponse.tool_calls,
                            timestamp: Date.now()
                        })
                    }
                }
            }

            // 处理 tools 节点
            if (step.tools) {
                const toolResults = step.tools.messages
                if (onProgress) {
                    onProgress({
                        sessionId,
                        type: 'tool_results',
                        results: toolResults.map(msg => ({
                            content: msg.content,
                            tool_call_id: msg.tool_call_id,
                            name: msg.name
                        })),
                        timestamp: Date.now()
                    })
                }
            }
        }

        // 如果流结束了还没有 finalAnswer，说明可能触发了递归限制或者逻辑中断
        if (!finalAnswer) {
            console.warn("流结束但未获取到最终答案，可能是达到了递归限制或被中断。");
            // 这里不要再次 invoke，而是返回一个提示或者检查 lastStep
            if (lastStep && lastStep.tools) {
                // 这种情况说明工具执行了，但 agent 还没来得及生成最终回复流就结束了（通常是因为递归限制）
                return "系统已达到最大执行步数，未能生成最终回复。请检查工具调用是否陷入循环。";
            }
        }

        return finalAnswer;

    } catch (error) {
        console.error("流处理发生错误:", error.name);
        if (error instanceof GraphRecursionError) {
            console.error("执行步骤过多，可能陷入死循环，已强制停止。");
            onProgress({
                sessionId,
                type: 'error',
                content: "由于某些原因导致工作流异常，请稍后重试",
            })
        }
        // 如果是递归错误，通常 LangGraph 会在这里抛出
        throw error;
    }
}

// 9. 导出
export {
    callLLM,
}