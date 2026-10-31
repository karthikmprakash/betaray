import { prisma } from "./db"
import { mockIssues, mockTestsSeed } from "./mockData"
async function main(){
  let project = await prisma.project.findFirst({ where:{ key:"BET"}})
  if(!project) project = await prisma.project.create({ data:{ key:"BET", name:"Betaray Platform", description:"E-commerce checkout" }})
  for(const is of mockIssues){
    await prisma.issue.upsert({ where:{ projectId_key:{projectId:project.id,key:is.key} }, create:{ key:is.key, projectId:project.id, type:is.type, summary:is.summary, status:is.status, priority:is.priority }, update:{}})
  }
  for(const t of mockTestsSeed){
    const exists = await prisma.test.findFirst({ where:{ projectId:project.id,key:t.key }})
    if(!exists){
      await prisma.test.create({ data:{ key:t.key, projectId:project.id, summary:t.summary, type:t.type, priority:t.priority, status:"To Do", gherkin: ("gherkin" in t ? t.gherkin : undefined), steps:{ create: ("steps" in t ? t.steps || [] : []).map((s,i)=>({ order:i, action:s.action, expected:s.expected }))} }})
    }
  }
  let user = await prisma.user.findUnique({ where:{ email:"karthik@betaray.app"}})
  if(!user) user= await prisma.user.create({ data:{ email:"karthik@betaray.app", name:"Karthik", role:"Admin"}})
  console.log("Seed done", project.key)
}
main().catch(e=>{ console.error(e); process.exit(1)}).finally(()=> prisma.$disconnect())
