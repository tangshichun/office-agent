export function toolsTextMapper(tool_calls) {
  return tool_calls.map(item => {
  console.log("toolsTextMapper", item)
    if (item.name === "tavily_search") {
      return "调用网络搜索模块，查询" + item.args.query
    }

    if (item.name === "tavily_search") {
      return "调用网络搜索模块，查询" + item.args.query
    }
  }).join('');
}