"use client"

import { useState } from "react"
import { motion } from "framer-motion"

export default function Home() {

  const [step,setStep] = useState(1)
  const [thought,setThought] = useState("")
  const [result,setResult] = useState<any>(null)

  const processThought = async () => {

    if(!thought) return

    setStep(2)

    const res = await fetch("/api/process-thought",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({thought})
    })

    const data = await res.json()

    setResult(data)

    setTimeout(()=>{
      setStep(3)
    },1200)
  }

  return (

    <main style={styles.page}>

      <div style={styles.container}>

        <h1 style={styles.title}>Thought Reflection</h1>

        <p style={styles.subtitle}>
          Separate facts from stories and create a balanced thought.
        </p>

        {step === 1 && (

          <motion.div initial={{opacity:0}} animate={{opacity:1}}>

            <textarea
              placeholder="Write the thought that is troubling you..."
              value={thought}
              onChange={(e)=>setThought(e.target.value)}
              style={styles.textarea}
            />

            <button style={styles.button} onClick={processThought}>
              Analyze Thought
            </button>

          </motion.div>

        )}

        {step === 2 && (

          <motion.div initial={{opacity:0}} animate={{opacity:1}}>

            <h3 style={styles.processingTitle}>
              Analyzing your thought...
            </h3>

            <Processing />

          </motion.div>

        )}

        {step === 3 && result && (

          <motion.div initial={{opacity:0}} animate={{opacity:1}}>

            <Card title="Fact" text={result.fact}/>
            <Card title="Story" text={result.story}/>
            <Card title="Emotion" text={result.emotion}/>

            <button style={styles.button} onClick={()=>setStep(4)}>
              Continue Reflection
            </button>

          </motion.div>

        )}

        {step === 4 && result && (

          <motion.div initial={{opacity:0}} animate={{opacity:1}}>

            <Card title="Reflection Question" text={result.reflectionQuestion}/>

            <button style={styles.button} onClick={()=>setStep(5)}>
              See Balanced Thought
            </button>

          </motion.div>

        )}

        {step === 5 && result && (

          <motion.div initial={{opacity:0}} animate={{opacity:1}}>

            <Card title="Balanced Thought" text={result.balancedThought}/>

            <button
              style={styles.secondaryButton}
              onClick={()=>{
                setStep(1)
                setThought("")
                setResult(null)
              }}
            >
              Start New Thought
            </button>

          </motion.div>

        )}

      </div>

    </main>

  )
}

function Processing(){

  const steps = [
    "Identifying facts",
    "Separating interpretation",
    "Detecting emotion",
    "Creating balanced thought"
  ]

  return (

    <div style={{marginTop:20}}>

      {steps.map((s,i)=>(
        <motion.div
          key={i}
          initial={{opacity:0,y:10}}
          animate={{opacity:1,y:0}}
          transition={{delay:i*0.4}}
          style={styles.processingStep}
        >
          ✓ {s}
        </motion.div>
      ))}

    </div>

  )
}

function Card({title,text}:{title:string,text:string}){

  return(

    <div style={styles.card}>

      <h3 style={styles.cardTitle}>{title}</h3>

      <p style={styles.cardText}>{text}</p>

    </div>

  )
}

const styles:any = {

  page:{
    minHeight:"100vh",
    background:"#f7f8fb",
    display:"flex",
    alignItems:"center",
    justifyContent:"center"
  },

  container:{
    width:"100%",
    maxWidth:640,
    background:"white",
    padding:"40px",
    borderRadius:12,
    boxShadow:"0 10px 30px rgba(0,0,0,0.05)"
  },

  title:{
    fontSize:32,
    fontWeight:600,
    marginBottom:8
  },

  subtitle:{
    color:"#666",
    marginBottom:30,
    fontSize:16
  },

  textarea:{
    width:"100%",
    minHeight:120,
    padding:16,
    borderRadius:8,
    border:"1px solid #ddd",
    fontSize:16,
    outline:"none"
  },

  button:{
    marginTop:20,
    width:"100%",
    padding:"14px",
    borderRadius:8,
    border:"none",
    background:"#4f46e5",
    color:"white",
    fontSize:16,
    fontWeight:500,
    cursor:"pointer"
  },

  secondaryButton:{
    marginTop:20,
    width:"100%",
    padding:"14px",
    borderRadius:8,
    border:"1px solid #ddd",
    background:"white",
    fontSize:16,
    cursor:"pointer"
  },

  card:{
    padding:20,
    borderRadius:10,
    background:"#f9fafc",
    marginBottom:16
  },

  cardTitle:{
    fontSize:18,
    marginBottom:8,
    fontWeight:600
  },

  cardText:{
    fontSize:16,
    lineHeight:1.6
  },

  processingTitle:{
    fontSize:18,
    marginTop:10
  },

  processingStep:{
    marginTop:10,
    fontSize:16,
    color:"#444"
  }

}