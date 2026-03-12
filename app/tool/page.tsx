"use client"

import { useState } from "react"
import { motion } from "framer-motion"

export default function Home(){

const [thought,setThought] = useState("")
const [analysis,setAnalysis] = useState<any>(null)
const [loading,setLoading] = useState(false)
const [hint,setHint] = useState("")
const [entryCount,setEntryCount] = useState(1)

const processThought = async () => {

  const words = thought.trim().split(/\s+/)

  if(words.length < 6){
    setHint("Try describing what happened and the thought your mind jumped to.")
    return
  }

  try{

    setHint("")
    setLoading(true)

    const res = await fetch("/api/process-thought",{
      method:"POST",
      headers:{ "Content-Type":"application/json"},
      body:JSON.stringify({thought})
    })

    const data = await res.json()

    setLoading(false)

    if(!data.valid){
      setHint(data.message || "We couldn't understand that clearly.")
      return
    }

    setAnalysis(data)

  }catch(e){

    console.error(e)
    setLoading(false)
    setHint("Something went wrong. Please try again.")

  }

}

const resetThought = () => {

  setThought("")
  setAnalysis(null)
  setHint("")
  setEntryCount(entryCount + 1)

}

return(

<main className="min-h-screen bg-slate-50 flex justify-center px-6 py-20">

<div className="max-w-2xl w-full">

<h1 className="text-4xl font-semibold text-slate-900 mb-4">
Is your mind overthinking a situation?
</h1>

<p className="text-lg text-slate-600 mb-10 leading-relaxed">
Write the thought that's on your mind.
We'll help you see it from a clearer perspective.
</p>

{/* INPUT */}

{!analysis && !loading && (

<div className="space-y-4">

<textarea
value={thought}
onChange={(e)=>setThought(e.target.value)}
placeholder="My manager didn’t reply to my message, and now I feel like they might be unhappy with me."
className={`w-full h-36 border rounded-xl p-5 text-lg focus:outline-none focus:ring-2 focus:ring-slate-400 ${hint ? "border-amber-300" : ""}`}
/>

{hint && (

<div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
{hint}
</div>

)}

<button
onClick={processThought}
className="w-full bg-slate-800 text-white py-4 rounded-xl text-lg hover:bg-slate-700 transition"
>
Analyze my thought
</button>

</div>

)}

{/* LOADING */}

{loading && (

<div className="bg-white border rounded-xl p-10 text-center">

<div className="flex justify-center space-x-2 mb-4">

<span className="w-3 h-3 bg-slate-400 rounded-full animate-bounce"/>
<span className="w-3 h-3 bg-slate-400 rounded-full animate-bounce delay-150"/>
<span className="w-3 h-3 bg-slate-400 rounded-full animate-bounce delay-300"/>

</div>

<p className="text-slate-600">
Analyzing your thought...
</p>

</div>

)}

{/* RESULTS */}

{analysis && (

<div className="space-y-5">

<Card title="Your thought" text={thought} bg="bg-slate-100"/>

<Card title="What happened" text={analysis.situation} bg="bg-blue-50"/>

<Card title="What your mind concluded" text={analysis.story} bg="bg-amber-50"/>

<Card title="How this might be making you feel" text={analysis.emotion} bg="bg-purple-50"/>

<div className="bg-rose-50 border rounded-xl p-6">

<h3 className="text-lg font-semibold mb-2">
What your mind might be doing
</h3>

<span className="inline-block bg-rose-200 text-rose-800 px-3 py-1 rounded-full text-sm font-medium mb-2">
{analysis.pattern}
</span>

<p className="text-slate-700">
{analysis.patternExplanation}
</p>

</div>

<Card
title="A more balanced way to look at this"
text={analysis.balancedThought}
bg="bg-green-50"
/>

{/* PATTERN DISCOVERY SECTION */}

<div className="bg-white border rounded-xl p-6">

<h3 className="text-lg font-semibold mb-2">
Your mind may have recurring thinking patterns
</h3>

<p className="text-slate-600 mb-4">
Add a few more thoughts and we'll start identifying them.
</p>

<p className="text-sm text-slate-500 mb-2">
Thought discovery progress
</p>

<p className="font-medium mb-4">
Entry {entryCount} of 5
</p>

<div className="w-full bg-slate-200 rounded-full h-2 mb-4">

<div
className="bg-slate-800 h-2 rounded-full"
style={{width: `${(entryCount/5)*100}%`}}
/>

</div>

<button
onClick={resetThought}
className="w-full border py-3 rounded-xl hover:bg-slate-50"
>
Add another thought
</button>

</div>

</div>

)}

</div>

</main>

)

}

function Card({title,text,bg}:any){

return(

<motion.div
initial={{opacity:0,y:10}}
animate={{opacity:1,y:0}}
className={`${bg} border rounded-xl p-6`}
>

<h3 className="font-semibold mb-2">
{title}
</h3>

<p className="text-slate-700 leading-relaxed whitespace-pre-line">
{text}
</p>

</motion.div>

)

}