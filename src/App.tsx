import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import './App.css'
import OpenAI from 'openai'
import { encoding_for_model } from "tiktoken";

const openai = new OpenAI({
  apiKey: localStorage.getItem("key") as string,
  dangerouslyAllowBrowser: true
});

let timeout: NodeJS.Timeout;
function debounce(func: Function, wait: number) {
  return (...args: any) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const limits: Record<OpenAI.Chat.ChatModel, number> = {
  "gpt-4o": 128000,
  "gpt-4": 8192,
  "gpt-4-turbo": 128000,
} as Record<OpenAI.Chat.ChatModel, number>
const MAX_MESSAGES = 30

function removeByIndex(arr: any[], index: number) {
  if (index > -1 && index < arr.length) {
    arr.splice(index, 1);
  }
  console.log(arr)
  return arr;
}

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam
function App() {
  const [enterToSend, setEnterToSend] = useState<boolean>(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [msgToEdit, setMsgToEdit] = useState("")
  const [model, setModel] = useState<OpenAI.Chat.ChatModel>("gpt-4")
  const send = async (msg: string) => {
    const messagesAfterSend: Message[] = [...messages, { role: 'user', content: msg }, { role: 'assistant', content: "" }]
    setMessages(messagesAfterSend)
    setMsgToEdit("")

    const stream = await openai.chat.completions.create({
      model: model,
      messages: [...messages, { role: 'user', content: msg }],
      stream: true,
      // temperature: 1,
      // frequency_penalty: 0,
      // presence_penalty: 0,
    });
    let response = ""
    for await (const chunk of stream) {
      response += chunk.choices[0]?.delta?.content || ''
      setMessages([...messagesAfterSend.slice(0, -1), { role: "assistant", content: response }])
      window.scrollTo(0, document.body.scrollHeight);
    }
    while (messagesAfterSend.length > MAX_MESSAGES) {
      messagesAfterSend.shift()
    }
    setMessages([...messagesAfterSend.slice(0, -1), { role: "assistant", content: response }])
  }
  useEffect(() => {
    const savedModel = localStorage.getItem("model") as OpenAI.Chat.ChatModel
    if (savedModel !== null) {
      setModel(savedModel)
    }
    const savedSetEnterToSend = localStorage.getItem("setEnterToSend")
    if (savedSetEnterToSend !== null) {
      setEnterToSend(savedSetEnterToSend == "1" ? true : false)
    }
  }, [])

  const [usedLimit, setUsedLimit] = useState(0)
  const [currentMsgTokens, setCurrentMsgTokens] = useState(0)
  const [currentMsgUsage, setCurrentMsgUsage] = useState(0)
  const [totalTokenUsed, setTotalTokenUsed] = useState(0)
  const debouncedCalculate = debounce(() => {
    const totalTokenUsed_ = messages.reduce((accumulator, msg) => accumulator + (encoding_for_model(model).encode(msg.content as string)).length, 0,)
    setTotalTokenUsed(totalTokenUsed_)
    const usedLimit_ = Math.round(totalTokenUsed / limits[model] * 10000) / 100
    setUsedLimit(usedLimit_)
    // * 10000 and then divided by 100 is to get the percentage with two decimal places.
    const currentMsgTokens_ = encoding_for_model(model).encode(msgToEdit).length
    setCurrentMsgTokens(currentMsgTokens_)
    const currentMsgUsage_ = Math.round(currentMsgTokens / limits[model] * 10000) / 100
    setCurrentMsgUsage(currentMsgUsage_)
  }, 2000);
  useEffect(() => {
    debouncedCalculate()
  }, [messages, msgToEdit])

  const combainedUsage = usedLimit + currentMsgUsage
  return (
    <>
      <div style={{ display: "flex" }}>
        <h1>ChatGPT</h1>
        <select name="model" style={{ margin: 20 }} onChange={e => { setModel(e.target.value as OpenAI.Chat.ChatModel); localStorage.setItem("model", e.target.value) }} value={model}>
          {Object.keys(limits).map((model, index) => <option key={index} value={model}>{model}</option>)}
        </select>
        <select name="model" style={{ margin: 20 }} onChange={e => { setEnterToSend(e.target.value == "1" ? true : false); localStorage.setItem("setEnterToSend", e.target.value) }} value={enterToSend ? "1" : "0"}>
          <option value={"1"}>Enter to send</option>
          <option value={"0"}>Only click to send</option>
        </select>
      </div>

      <button onClick={() => setMessages([])} style={{ position: "fixed", top: 30, right: 30 }}>Clear all!</button>

      <div>
        {messages.map((msg, index) => <div key={index}>
          {msg.role == "user" ? <div>
            <div style={{ display: "flex" }}><h3 style={{ marginRight: 20 }}>User:</h3>
              {index == messages.length - 2 ? <button style={{ marginRight: 20, margin: 10 }} onClick={() => { setMsgToEdit(msg.content as string); setMessages(messages.splice(0, messages.length - 2)) }}>Edit🖊️</button> : null}
              <button style={{ marginRight: 20, margin: 10 }} onClick={() => setMessages(removeByIndex([...messages], index))}>❌</button>
            </div>

            <p style={{ color: "#678fcf", fontSize: 20, whiteSpace: "pre-wrap" }}>{msg.content as string}</p>
          </div> : <div>
            <div style={{ display: "flex" }}><h3 style={{ marginRight: 20 }}>{model}:</h3>
              <button style={{ marginRight: 20, margin: 10 }} onClick={() => setMessages(removeByIndex([...messages], index))}>❌</button>

            </div>
            <div style={{ fontSize: 20 }}><Markdown>{msg.content as string}</Markdown></div>
            <hr />
          </div>}
        </div>)}
      </div>
      <div style={{ display: "flex" }}>
        <textarea id="w3review" name="w3review" rows={5} cols={100} onChange={e => setMsgToEdit(e.target.value)} onKeyUp={enterToSend ? (event) => { event.key == "Enter" && send(msgToEdit) } : undefined} value={msgToEdit}>
        </textarea>
        <button onClick={() => send(msgToEdit)}>
          Send({messages.length}/{MAX_MESSAGES})
        </button>
      </div>
      <h4>Used limit: {usedLimit}% ({totalTokenUsed} tokens), current message usage: {currentMsgUsage}% ({currentMsgTokens} tokens), combained usage: <span style={{ color: combainedUsage > 90 ? "red" : "black" }}>{combainedUsage}</span>%, model max token: {limits[model]}</h4>
    </>
  )
}

export default App
