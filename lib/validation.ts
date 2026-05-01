import { z } from "zod";
export const startupSchema=z.object({company_name:z.string().min(2),sector:z.string(),stage:z.string(),country:z.string(),funding_target:z.number(),valuation:z.number(),traction:z.string(),revenue:z.number(),team_size:z.number().int()});
export const decisionSchema=z.object({status:z.enum(["Interested","Need More Info","Due Diligence","Hold","Rejected","Term Sheet","Invested"]),score:z.number().min(1).max(10),risk_level:z.enum(["Low","Medium","High"]),next_action:z.string(),follow_up_date:z.string()});
