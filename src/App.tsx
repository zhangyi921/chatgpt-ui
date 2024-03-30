import { useState } from 'react'
import Markdown from 'react-markdown'
import './App.css'
import OpenAI from 'openai'
const openai = new OpenAI({
  apiKey:  localStorage.getItem("key")as string,
  dangerouslyAllowBrowser: true
});

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam
function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [msgToEdit, setMsgToEdit] = useState("")
  const send = async (msg: string) => {
    const messagesAfterSend: Message[] = [...messages, {role: 'user', content: msg}, {role: 'assistant', content: ""}]
    setMessages(messagesAfterSend)
    setMsgToEdit("")
    
    const stream = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [...messages, {role: 'user', content: msg}],
      stream: true,
      // temperature: 1,
      // frequency_penalty: 0,
      // presence_penalty: 0,
    });
    let response = ""
    for await (const chunk of stream) {
      response += chunk.choices[0]?.delta?.content || ''
      setMessages([...messagesAfterSend.slice(0, -1), {role: "assistant", content: response}])
      window.scrollTo(0, document.body.scrollHeight);
    }
    while (messagesAfterSend.length > 5){
      messagesAfterSend.shift()
    }
    setMessages([...messagesAfterSend.slice(0, -1), {role: "assistant", content: response}])
  }
  return (
    <>
      <h1>ChatGPT</h1>
      <div>
        {messages.map((msg, index) => <div key={index}>
          {msg.role == "user" ? <div>
            <h3>User:</h3>
            <p style={{color: "#678fcf", fontSize: 20}}>{msg.content as string}</p>
          </div> : <div>
            <h3>ChatGPT:</h3>
            <div style={{fontSize: 20}}><Markdown>{msg.content as string}</Markdown></div>
            <hr />
            </div>}
        </div>)}
      </div>
      <textarea id="w3review" name="w3review" rows={5} cols={100} onChange={e => setMsgToEdit(e.target.value)} value={msgToEdit}>
      </textarea>
      <button onClick={() => send(msgToEdit)}>
        Send
      </button>
    </>
  )
}

export default App
