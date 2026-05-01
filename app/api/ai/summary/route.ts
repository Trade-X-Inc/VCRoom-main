import OpenAI from "openai";
import { NextResponse } from "next/server";
export async function POST(req:Request){const {context}=await req.json(); const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY}); const completion=await client.responses.create({model:"gpt-4.1-mini",input:`Summarize startup and highlight missing docs, risks, and questions:\n${context}`}); return NextResponse.json({generated:true,disclaimer:"Assistant-generated; not financial advice.",summary:completion.output_text});}
