import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import './App.css'
import OpenAI from 'openai'
const openai = new OpenAI({
  apiKey: localStorage.getItem("key") as string,
  dangerouslyAllowBrowser: true
});


const limits: Record<OpenAI.Chat.ChatModel, number> = {
  "gpt-4o": 1280000 * 4,
  "gpt-4": 8192 * 4,
  "gpt-4-turbo": 1280000 * 4,
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

  const usedLimit = Math.round(messages.reduce((accumulator, msg) => accumulator + (msg.content as string).length, 0,) / limits[model] * 10000) / 100
  const currentMsgUsage = Math.round(msgToEdit.length / limits[model] * 10000) / 100
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
        <textarea id="w3review" name="w3review" rows={5} cols={100} onChange={e => setMsgToEdit(e.target.value)} onKeyDown={enterToSend ? (event) => { event.key == "Enter" && send(msgToEdit) } : undefined} value={msgToEdit}>
        </textarea>
        <button onClick={() => send(msgToEdit)}>
          Send({messages.length}/{MAX_MESSAGES})
        </button>
      </div>
      <h4>Used limit: {usedLimit}%, current message usage: {currentMsgUsage}%, combained usage: <span style={{ color: combainedUsage > 90 ? "red" : "black" }}>{combainedUsage}</span>%</h4>

    </>
  )
}

export default App
