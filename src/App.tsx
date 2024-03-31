import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import './App.css'
import OpenAI from 'openai'
const openai = new OpenAI({
  apiKey: localStorage.getItem("key") as string,
  dangerouslyAllowBrowser: true
});
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
  const [messages, setMessages] = useState<Message[]>([])
  const [msgToEdit, setMsgToEdit] = useState("")
  const [model, setModel] = useState<OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming["model"]>("gpt-4")
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
    const savedModel = localStorage.getItem("model")
    if (savedModel !== null) {
      setModel(savedModel)
    }
  }, [])
  return (
    <>
      <div style={{ display: "flex" }}>
        <h1>ChatGPT</h1>
        <select name="model" style={{ margin: 20 }}onChange={e => { setModel(e.target.value); localStorage.setItem("model", e.target.value) }} value={model}>
          <option value="gpt-4-turbo-preview">gpt-4-turbo-preview</option>
          <option value="gpt-4">gpt-4</option>
        </select>
      </div>

      <button onClick={() => setMessages([])} style={{ position: "fixed", top: 30, right: 30 }}>Clear all!</button>

      <div>
        {messages.map((msg, index) => <div key={index}>
          {msg.role == "user" ? <div>
            <div style={{ display: "flex" }}><h3 style={{ marginRight: 20 }}>User:</h3>
              {index == messages.length-2? <button style={{ marginRight: 20, margin: 10 }} onClick={() => {setMsgToEdit(msg.content as string); setMessages(messages.splice(0 ,messages.length-2))}}>Edit🖊️</button>:null}
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
        <textarea id="w3review" name="w3review" rows={5} cols={100} onChange={e => setMsgToEdit(e.target.value)} value={msgToEdit}>
        </textarea>
        <button onClick={() => send(msgToEdit)}>
          Send({messages.length}/{MAX_MESSAGES})
        </button>
      </div>

    </>
  )
}

export default App
