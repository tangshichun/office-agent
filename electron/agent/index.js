import 'dotenv/config'
import {TavilySearch} from '@langchain/tavily'
import {HumanMessage} from '@langchain/core/messages'
import {ChatDeepSeek} from '@langchain/deepseek'
import {MessagesAnnotation, StateGraph} from '@langchain/langgraph'
import {ToolNode} from '@langchain/langgraph/prebuilt'
import {buildSystemMessage, FileMemory} from "./file-memory";
import {toolsTextMapper} from "../../utils/tools-text-mapper";
import {fileTools} from "./tools/FileTools";


// 2. 定义工具集
const tools = [
  new TavilySearch({maxResults: 3, tavilyApiKey: "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"}),
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
  .addEdge('tools', 'agent')  // 关键：工具执行后回到agent
  .addConditionalEdges('agent', shouldContinue)

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

  // 使用 stream 执行，但正确处理状态
  const stream = await app.stream({
    messages: [new HumanMessage(message)],
  }, {
    configurable: {
      sessionId
    }
  })

  let finalAnswer = null
  let lastStep = null

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
        data: step,
        timestamp: Date.now()
      })
    }

    // 处理 agent 节点的 LLM 响应
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

      // 如果有工具调用，发送工具调用信息
      if (llmResponse.tool_calls?.length) {
        if (onProgress) {
          onProgress({
            sessionId,
            type: 'tool_calls',
            tool_calls: llmResponse.tool_calls,
            timestamp: Date.now()
          })
        }
      }

      // 如果没有工具调用，这就是最终答案
      if (!llmResponse.tool_calls?.length && llmResponse.content) {
        finalAnswer = llmResponse.content
      }
    }

    // 处理 tools 节点的执行结果
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

  // 从最后一步中提取最终答案
  // 最后一步可能是 agent 或 tools，需要找到最终的 AI 响应
  if (lastStep) {
    // 如果最后一步是 agent，直接取内容
    if (lastStep.agent) {
      const lastResponse = lastStep.agent.messages[0]
      if (lastResponse.content && !finalAnswer) {
        finalAnswer = lastResponse.content
      }
    }
      // 如果最后一步是 tools，说明还需要一次 agent 调用才能得到最终答案
    // 但流已经结束了，所以需要额外处理
    else if (lastStep.tools) {
      // 工具执行后应该还有一次 agent 调用，但流可能已经结束
      // 这里做个安全处理：如果没有最终答案，再调用一次获取
      if (!finalAnswer) {
        console.log("流式执行未获取到最终答案，尝试获取最终状态...")
        const finalState = await app.invoke({
          messages: [new HumanMessage(message)]
        })
        const lastMsg = finalState.messages[finalState.messages.length - 1]
        if (lastMsg.content) {
          finalAnswer = lastMsg.content
        }
      }
    }
  }

  // 发送最终答案
  if (onProgress && finalAnswer) {
    onProgress({
      sessionId,
      type: 'final_answer',
      content: finalAnswer,
      timestamp: Date.now()
    })
  }

  return finalAnswer || "未获取到有效响应"
}

// 9. 导出
export {
  callLLM,
}