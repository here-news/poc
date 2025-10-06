centroid: 
gist: A service chain to extract content rigorously 
time range: Oct3 ~ 
diff: 
- the strange https://me.lacounty.gov/case-detail/?caseNumber=2025-14252 problem was mitigated
- even Reuters/Bloomberg works now, some old rougue ones like Toronto Star, USAtoday, etc. Yet some author names still missing  or hard to extract (like in USA today)
- yet https://www.reuters.com/world/china/philippines-says-watching-chinas-actions-south-china-sea-nature-reserve-2025-10-03/ still can't access via program, as it's even blocked iframely
- now publishing time and author names can be well extracted from SCMP case
- the content validate works better by flagging "short content" and working on globaltimes.cn, foreignpolicy.com(paywalled but flagged), and LA examiner(short and data oriented), all basically correct and richer now
- the content validator(cleanser) now act as transparent filter rather than a gate, the Foreign Policy article about Yu Menglong now flags as : metadata date mismatch, no author, and navigation heavy which is true, but also it should flag as incomplete.  
