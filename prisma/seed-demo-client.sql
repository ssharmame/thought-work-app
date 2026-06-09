-- ============================================================
--  ThoughtLens – Demo seed for Sunil Sharma
--  Run this in: Supabase → SQL Editor → New query → Run
--
--  Profile: 40 years old, separated 2 years, daughter lives
--  with ex-wife, sees her weekends, lost job 1 year ago.
--  Core fears: losing daughter, being alone forever,
--  never finding work, no chance of reconciliation.
--
--  Patterns: catastrophizing (7), mind_reading (7),
--            fortune_telling (3), self_criticism (1)
--  Emotions: anxiety (8), fear (4), sadness (4), guilt (2)
-- ============================================================

DO $$
DECLARE
  v_practitioner_id   TEXT := 'fd926b89-cac6-41c6-88ee-a908408af082';
  v_client_id         TEXT := '1be387fb-b0bf-41be-8fbd-458355bf595c';
  v_visitor_id        TEXT := gen_random_uuid()::TEXT;
  v_session_id        TEXT := gen_random_uuid()::TEXT;

  v_thread_daughter   TEXT := gen_random_uuid()::TEXT;
  v_thread_alone      TEXT := gen_random_uuid()::TEXT;
  v_thread_work       TEXT := gen_random_uuid()::TEXT;
  v_thread_marriage   TEXT := gen_random_uuid()::TEXT;

BEGIN

  -- ── 1. Set name ───────────────────────────────────────────────────────────
  UPDATE "UserProfile" SET name = 'Sunil Sharma' WHERE id = v_client_id;

  -- ── 2. Clear previous data ────────────────────────────────────────────────
  DELETE FROM "ThoughtEntry" WHERE "userId" = v_client_id;
  DELETE FROM "ThreadInsight" WHERE "threadId" IN (
    SELECT id FROM "Thread" WHERE "userId" = v_client_id
  );
  DELETE FROM "Thread" WHERE "userId" = v_client_id;

  -- ── 3. Visitor + Session ─────────────────────────────────────────────────
  INSERT INTO "Visitor" (id, "firstSeen")
  VALUES (v_visitor_id, NOW() - INTERVAL '32 days')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO "Session" (id, "visitorId", "createdAt")
  VALUES (v_session_id, v_visitor_id, NOW() - INTERVAL '32 days')
  ON CONFLICT (id) DO NOTHING;

  -- ── 4. Threads ────────────────────────────────────────────────────────────
  INSERT INTO "Thread" (id, "sessionId", "visitorId", "userId", title, situation, "createdAt") VALUES

    (v_thread_daughter, v_session_id, v_visitor_id, v_client_id,
     'Fear of losing my daughter',
     'My daughter lives with her mother and I only see her on weekends',
     NOW() - INTERVAL '30 days'),

    (v_thread_alone, v_session_id, v_visitor_id, v_client_id,
     'Being alone forever',
     'Fear that after the separation I will end up completely alone with no family',
     NOW() - INTERVAL '22 days'),

    (v_thread_work, v_session_id, v_visitor_id, v_client_id,
     'Finding work again',
     'I lost my job a year after separation and have been struggling to get hired at 40',
     NOW() - INTERVAL '15 days'),

    (v_thread_marriage, v_session_id, v_visitor_id, v_client_id,
     'Reconciliation and my marriage',
     'Part of me still wonders whether there is any chance of things working out with my ex-wife',
     NOW() - INTERVAL '8 days')

  ON CONFLICT (id) DO NOTHING;

  -- ── 5. Thought entries ────────────────────────────────────────────────────
  INSERT INTO "ThoughtEntry" (
    id, "threadId", "sessionId", "visitorId", "userId",
    thought, "automaticThought", story, emotion, "coreBelief",
    "reflectionQuestion", "balancedThought", pattern, "patternExplanation", normalization,
    situation, intent, status, "createdAt"
  ) VALUES

  -- ── Week 1 ────────────────────────────────────────────────────────────────

  -- 1. mind_reading  Day -28  Sat 10:45pm
  (gen_random_uuid(), v_thread_daughter, v_session_id, v_visitor_id, v_client_id,
   'She seemed quieter than usual when I dropped her off — she must be getting used to a life that does not really include me',
   'My daughter is adjusting to a life where I am not central anymore',
   'Her quietness at drop-off means she is drifting away from me emotionally',
   'anxiety',
   'My daughter is slowly forgetting how important I am to her',
   'What else could explain a child being quiet at the moment of saying goodbye to a parent she loves?',
   'Children are often quiet at transitions — it is one of the hardest moments for them too. Her silence is grief, not distance.',
   'mind_reading',
   'Reading a specific emotion or meaning into behaviour without enough evidence',
   'Many fathers who see their children only on weekends interpret drop-off quietness as rejection. It almost always means the opposite.',
   'Dropping my daughter back at her mother''s after the weekend',
   'THOUGHT', 'REFLECTION_COMPLETE',
   NOW() - INTERVAL '28 days' + INTERVAL '22 hours 45 minutes'),

  -- 2. catastrophizing  Day -26  Mon 11:20pm
  (gen_random_uuid(), v_thread_alone, v_session_id, v_visitor_id, v_client_id,
   'I am going to end up completely alone — no wife, no daughter nearby, no job, nothing left',
   'I will end up with nothing and no one',
   'Everything that mattered has already gone and there is no path back',
   'fear',
   'I will be alone for the rest of my life',
   'If you imagined five years from now, what is at least one thing that could realistically be different?',
   'Losing a marriage, a job, and daily access to a child at the same time is devastating. That pain is real. But it is not a permanent state.',
   'catastrophizing',
   'Jumping to the most extreme negative outcome as though it is already decided',
   'When multiple major losses happen close together, the mind treats them as a single irreversible verdict. They are not.',
   'Lying awake at night after putting the phone down following a difficult week',
   'THOUGHT', 'REFLECTION_COMPLETE',
   NOW() - INTERVAL '26 days' + INTERVAL '23 hours 20 minutes'),

  -- 3. fortune_telling  Day -25  Tue 8:10am
  (gen_random_uuid(), v_thread_work, v_session_id, v_visitor_id, v_client_id,
   'I have been rejected from six roles now. At 40, with a gap in my CV, no one is going to hire me',
   'No one will hire me at 40 with a CV gap',
   'My age and circumstances have made me unemployable',
   'anxiety',
   'I am too old and too damaged for the job market to want me',
   'What is one thing you have that a 25 year old applicant does not?',
   'Six rejections is a normal early part of any job search. A CV gap after a major life crisis is not disqualifying — it is human.',
   'fortune_telling',
   'Treating early evidence as proof of a permanent, certain outcome',
   'Job searching after redundancy during a personal crisis is one of the hardest experiences. The rejection rate early on tells you nothing about what will eventually happen.',
   'Reviewing job application rejections while preparing another application',
   'THOUGHT', 'REFLECTION_COMPLETE',
   NOW() - INTERVAL '25 days' + INTERVAL '8 hours 10 minutes'),

  -- 4. mind_reading  Day -24  Wed 9:30pm
  (gen_random_uuid(), v_thread_marriage, v_session_id, v_visitor_id, v_client_id,
   'My ex''s tone on the phone was cold again tonight. She has completely closed the door and probably wants me out of her life for good',
   'Her cold tone means she has no interest in ever reconciling',
   'The way she speaks to me now tells me exactly how she feels — there is nothing left',
   'sadness',
   'My ex-wife has no warmth left for me at all',
   'Is a cold tone during a practical co-parenting call a reliable signal of how she feels about everything else?',
   'A cold tone on a logistical call about their daughter does not tell him how she feels about the marriage or him as a person. These are two different things.',
   'mind_reading',
   'Drawing large conclusions about someone''s inner state from a limited interaction',
   'Co-parenting calls are often transactional and guarded, especially early in a separation. Tone on these calls rarely reflects the full emotional picture.',
   'Brief phone call with ex-wife to arrange weekend pickup for daughter',
   'THOUGHT', 'REFLECTION_COMPLETE',
   NOW() - INTERVAL '24 days' + INTERVAL '21 hours 30 minutes'),

  -- ── Week 2 ────────────────────────────────────────────────────────────────

  -- 5. catastrophizing  Day -21  Sat 11:55pm
  (gen_random_uuid(), v_thread_daughter, v_session_id, v_visitor_id, v_client_id,
   'She only sees me two days a week. By the time she is a teenager she is going to feel like I was barely there',
   'My daughter will grow up feeling abandoned by me because I only see her on weekends',
   'Weekend contact is not enough to maintain a real bond with my child',
   'fear',
   'I am failing my daughter by not being there every day',
   'What do you actually know about the quality of the relationship you are building with her on those two days?',
   'Children who have consistent, present, attuned weekend time with a parent often have deeply secure bonds with that parent. Frequency is not the only measure.',
   'catastrophizing',
   'Treating limited contact as inevitable evidence of a damaged relationship',
   'Many fathers who parent part-time carry enormous guilt about it. That guilt often does not reflect the reality of what their child actually experiences.',
   'End of weekend with daughter, lying in bed after dropping her home',
   'THOUGHT', 'REFLECTION_COMPLETE',
   NOW() - INTERVAL '21 days' + INTERVAL '23 hours 55 minutes'),

  -- 6. mind_reading  Day -20  Sun 10:15am
  (gen_random_uuid(), v_thread_daughter, v_session_id, v_visitor_id, v_client_id,
   'She asked to call her mum halfway through our Saturday. She never used to do that. She is more comfortable there than with me now',
   'My daughter prefers her mother''s home over mine',
   'Wanting to call her mother during our time together means I am losing her attachment',
   'anxiety',
   'My daughter is becoming more bonded to her mother''s world than to me',
   'What are all the reasons a child might want to call the other parent during a visit?',
   'Children calling the other parent during visits is extremely common and usually about reassurance, not preference. It often has nothing to do with who they love more.',
   'mind_reading',
   'Interpreting a child''s behaviour as a signal about attachment rather than normal developmental need',
   'This is one of the most common fears separated fathers have. Child psychologists consistently say it reflects the child''s security, not a preference.',
   'Daughter asked to call her mother during Saturday afternoon together',
   'THOUGHT', 'REFLECTION_COMPLETE',
   NOW() - INTERVAL '20 days' + INTERVAL '10 hours 15 minutes'),

  -- 7. catastrophizing  Day -18  Tue 11:40pm
  (gen_random_uuid(), v_thread_work, v_session_id, v_visitor_id, v_client_id,
   'If I do not find work soon my savings will run out and I will not be able to pay maintenance. She will take me to court and I could lose even my weekend access',
   'Running out of money could ultimately cost me access to my daughter',
   'Financial failure is connected directly to losing my daughter',
   'fear',
   'If I cannot provide financially I will lose my daughter',
   'How many steps would actually have to happen for the worst case outcome you just described?',
   'There are many steps between the current situation and that outcome, and most of them have practical solutions. The mind is compressing a whole chain of events into one catastrophe.',
   'catastrophizing',
   'Connecting a current difficulty directly to the worst possible long-term outcome',
   'Fathers dealing with job loss during separation often conflate financial worry with custody fear. They are related but not the same problem.',
   'Reviewing finances late at night and calculating how long savings will last',
   'THOUGHT', 'REFLECTION_COMPLETE',
   NOW() - INTERVAL '18 days' + INTERVAL '23 hours 40 minutes'),

  -- 8. fortune_telling  Day -16  Thu 8:45am
  (gen_random_uuid(), v_thread_marriage, v_session_id, v_visitor_id, v_client_id,
   'Two years have gone by. If it was going to work out we would have tried by now. It is over and I need to accept that',
   'Two years without reconciliation means it will never happen',
   'The amount of time that has passed is proof that reconciliation is not possible',
   'sadness',
   'Too much time has passed for anything to change between us',
   'What would need to be true for reconciliation to still be a possibility, even at this stage?',
   'Two years is actually a relatively short time in the context of a long marriage. Many couples have reconciled after longer separations when both people were ready.',
   'fortune_telling',
   'Using time elapsed as evidence of a permanently closed door',
   'The belief that a window has closed because of how much time has passed is very common after separation. Time passing is neutral — it does not decide outcomes.',
   'Morning reflection on the anniversary of when the separation became official',
   'THOUGHT', 'REFLECTION_COMPLETE',
   NOW() - INTERVAL '16 days' + INTERVAL '8 hours 45 minutes'),

  -- ── Week 3 ────────────────────────────────────────────────────────────────

  -- 9. mind_reading  Day -14  Sat 9:50pm
  (gen_random_uuid(), v_thread_daughter, v_session_id, v_visitor_id, v_client_id,
   'She did not ask when she could see me again this weekend when I dropped her off. She always used to ask that',
   'She is no longer eager to see me the way she used to be',
   'Not asking when she will see me again means she is becoming indifferent about our time together',
   'anxiety',
   'My daughter is losing enthusiasm for spending time with me',
   'What might a tired seven-year-old be thinking about at the moment of drop-off?',
   'Drop-off is a transition moment full of emotion for children. Not asking a question in that moment says very little about how much she values their time together.',
   'mind_reading',
   'Treating the absence of a behaviour as evidence of a changed feeling',
   'Separated fathers often monitor small changes in their child''s behaviour very closely because the stakes feel so high. This makes normal variation feel significant.',
   'Dropping daughter at her mother''s after a weekend together',
   'THOUGHT', 'REFLECTION_COMPLETE',
   NOW() - INTERVAL '14 days' + INTERVAL '21 hours 50 minutes'),

  -- 10. catastrophizing  Day -13  Sun 11:10pm
  (gen_random_uuid(), v_thread_alone, v_session_id, v_visitor_id, v_client_id,
   'I am 40 years old, separated, unemployed, living alone. What woman is going to want this? I am going to be alone for the rest of my life',
   'No one will want to be with me in this situation',
   'My current circumstances make me permanently unlovable',
   'sadness',
   'I am too broken and too old for anyone to want a life with me',
   'If a close friend described his situation this way, what would you actually say to him?',
   'These circumstances are temporary, even when they do not feel that way. They describe a chapter, not a life sentence.',
   'catastrophizing',
   'Treating a difficult current situation as a permanent and defining state',
   'Men going through simultaneous separation and job loss often reach this conclusion. It is a measure of how much pain they are in, not an accurate forecast.',
   'Sunday night alone after dropping daughter home, flat quiet',
   'THOUGHT', 'REFLECTION_COMPLETE',
   NOW() - INTERVAL '13 days' + INTERVAL '23 hours 10 minutes'),

  -- 11. mind_reading  Day -12  Mon 2:30pm
  (gen_random_uuid(), v_thread_work, v_session_id, v_visitor_id, v_client_id,
   'The interviewer cut the call short and said they would be in touch. They have already decided. They could tell something was off about me',
   'The interviewer sensed my personal problems and decided against me',
   'My personal situation is visible in interviews and is costing me opportunities',
   'anxiety',
   'People can see that I am struggling and it makes them not want to hire me',
   'What are two other reasons an interviewer might cut a call short that have nothing to do with you?',
   'Interviews are cut short for many reasons — schedules, back-to-back calls, format requirements. It is rarely a signal about the candidate.',
   'mind_reading',
   'Assuming you know what the interviewer concluded and why, without any evidence',
   'Job seekers going through personal difficulty often project that difficulty into neutral interview signals. The pattern is very common and almost always inaccurate.',
   'End of a video interview that felt shorter than expected',
   'THOUGHT', 'REFLECTION_COMPLETE',
   NOW() - INTERVAL '12 days' + INTERVAL '14 hours 30 minutes'),

  -- 12. catastrophizing  Day -10  Wed 10:55pm
  (gen_random_uuid(), v_thread_alone, v_session_id, v_visitor_id, v_client_id,
   'I picture myself at 55 — still alone, estranged from my daughter, never having recovered. That is where this is heading',
   'In 15 years I will still be alone and disconnected from my daughter',
   'The trajectory of my life is already set and it leads to complete isolation',
   'fear',
   'My future is already decided and it is empty',
   'What would the version of you at 55 need to have done differently between now and then for that picture to change?',
   'A picture of the future is not a prediction — it is a fear dressed up as a forecast. The future at 55 depends on choices that have not been made yet.',
   'catastrophizing',
   'Treating a feared future image as though it is already a likely outcome',
   'When we are in sustained pain, the mind projects that pain forward and mistakes it for the future. Almost no one''s life at 55 looks like their worst fear at 40.',
   'Late night alone, could not sleep, mind replaying the last two years',
   'THOUGHT', 'REFLECTION_COMPLETE',
   NOW() - INTERVAL '10 days' + INTERVAL '22 hours 55 minutes'),

  -- 13. self_criticism  Day -9  Thu 7:40am
  (gen_random_uuid(), v_thread_marriage, v_session_id, v_visitor_id, v_client_id,
   'I should have fought harder for the marriage. I gave up too easily and now my daughter pays the price for my failure',
   'I did not try hard enough to save the marriage',
   'The separation is ultimately my fault and my daughter is suffering because of my choices',
   'guilt',
   'I am responsible for destroying my family',
   'What would it mean to hold your choices with compassion rather than verdict?',
   'Marriages end because of patterns between two people, not because one person failed. The belief that he alone is responsible is not accurate.',
   'self_criticism',
   'Taking sole responsibility for a complex situation involving two people',
   'It is very common for separated men to absorb the full weight of blame for a marriage ending, especially when they are also dealing with job loss and separation from their child.',
   'Morning reflection while getting ready, daughter''s photo on the shelf',
   'THOUGHT', 'REFLECTION_COMPLETE',
   NOW() - INTERVAL '9 days' + INTERVAL '7 hours 40 minutes'),

  -- ── Week 4 ────────────────────────────────────────────────────────────────

  -- 14. mind_reading  Day -7  Sat 11:20pm
  (gen_random_uuid(), v_thread_marriage, v_session_id, v_visitor_id, v_client_id,
   'She mentioned she went to a friend''s birthday with some people from work. She sounded lighter than she has in months. She has already moved on',
   'My ex-wife is moving on and is happier without me',
   'Her sounding happier is proof that she has emotionally closed the chapter on us',
   'sadness',
   'She is already moving forward and I am the only one still stuck',
   'Is it possible for someone to have a good evening and also still carry complicated feelings about a marriage?',
   'People can have good moments and still carry grief. Her sounding lighter on one call is not a verdict on whether she has moved on from everything.',
   'mind_reading',
   'Interpreting a single mood signal as evidence of a complete emotional state',
   'It is very painful to imagine an ex moving on, and that pain makes us read even neutral signals as confirmation. It is a very human and very common distortion.',
   'Phone call with ex-wife about weekend logistics, she mentioned a work social event',
   'THOUGHT', 'REFLECTION_COMPLETE',
   NOW() - INTERVAL '7 days' + INTERVAL '23 hours 20 minutes'),

  -- 15. catastrophizing  Day -6  Sun 9:30pm
  (gen_random_uuid(), v_thread_daughter, v_session_id, v_visitor_id, v_client_id,
   'She is seven now. In ten years she will be seventeen and barely want to see me. I am going to miss her entire childhood',
   'I will miss my daughter growing up because of the separation',
   'The structure of our arrangement means I am already absent from her real life',
   'fear',
   'My daughter will grow up without me being a real presence in her life',
   'What do you actually know about what your relationship with her will look like when she is seventeen?',
   'Teenagers with separated parents who had consistent, caring part-time fathers often have very strong bonds with those fathers. Ten years of weekends is not nothing.',
   'catastrophizing',
   'Jumping from current pain to a worst-case image of the distant future',
   'The fear of missing a child''s childhood is one of the most visceral fears separated parents carry. It is also one of the most distorted — because presence is about quality, not just quantity.',
   'Quiet Sunday evening after dropping daughter home, thinking about the future',
   'THOUGHT', 'REFLECTION_COMPLETE',
   NOW() - INTERVAL '6 days' + INTERVAL '21 hours 30 minutes'),

  -- 16. fortune_telling  Day -4  Tue 3:15pm
  (gen_random_uuid(), v_thread_work, v_session_id, v_visitor_id, v_client_id,
   'No serious company is going to look past a year-long gap combined with the fact that I am 40. I should probably just accept a much lower-level role permanently',
   'My career at the level I was at is over',
   'The gap and my age have permanently reduced what is available to me professionally',
   'anxiety',
   'My professional life will never recover to what it was',
   'What would you need to see to know that a recovery to your previous level was still possible?',
   'Many professionals have returned to senior roles after longer gaps than this. Age and a gap narrow the path — they do not close it.',
   'fortune_telling',
   'Treating current barriers as permanent ceilings rather than current obstacles',
   'Career anxiety after redundancy during a personal crisis is extremely common. The belief that the gap is permanently damaging is rarely accurate when looked at from the outside.',
   'Reviewing a job description and wondering whether to apply given the seniority level',
   'THOUGHT', 'REFLECTION_COMPLETE',
   NOW() - INTERVAL '4 days' + INTERVAL '15 hours 15 minutes'),

  -- 17. mind_reading  Day -2  Thu 8:50am
  (gen_random_uuid(), v_thread_daughter, v_session_id, v_visitor_id, v_client_id,
   'My ex said our daughter had a nightmare last week and called out for her mum. She never calls for me in those moments. I am not her safe person',
   'My daughter does not see me as her safe person',
   'The fact that she called for her mother in distress rather than me means I hold less attachment security for her',
   'guilt',
   'I am not the parent my daughter turns to when she is scared',
   'Who is most available to her in the night — and does availability explain this rather than attachment?',
   'Children call for the parent who is physically present at night. That is proximity, not a ranking of love or security.',
   'mind_reading',
   'Interpreting a practical behaviour driven by availability as an emotional signal about attachment',
   'This particular fear — not being the parent a child calls for — is one of the most painful for part-time fathers. It almost always reflects logistics, not bonding.',
   'Ex-wife mentioned their daughter had a nightmare and called for her mother',
   'THOUGHT', 'REFLECTION_COMPLETE',
   NOW() - INTERVAL '2 days' + INTERVAL '8 hours 50 minutes'),

  -- 18. catastrophizing  Day -1  Fri 11:50pm
  (gen_random_uuid(), v_thread_alone, v_session_id, v_visitor_id, v_client_id,
   'Tonight I sat in this flat for six hours and did not speak to a single person. This is my life now. This is what it is going to be',
   'Spending tonight alone is what the rest of my life will look like',
   'A single quiet night is evidence of permanent and total isolation',
   'sadness',
   'This loneliness is permanent',
   'What is the difference between a quiet Friday night and a permanent life sentence?',
   'One silent night is not a life. It is a Friday night. The mind in pain tries to make it mean everything. It does not.',
   'catastrophizing',
   'Treating a temporary experience of loneliness as a permanent and defining truth',
   'Acute loneliness after separation, job loss and reduced access to a child is one of the most painful experiences a person can go through. It does not last forever, even when it feels that way.',
   'Home alone on a Friday evening with no plans and the flat very quiet',
   'THOUGHT', 'REFLECTION_COMPLETE',
   NOW() - INTERVAL '1 day' + INTERVAL '23 hours 50 minutes');

  RAISE NOTICE 'Demo data seeded for: Sunil Sharma (id: %)', v_client_id;
  RAISE NOTICE 'Navigate to: /dashboard/clients/%', v_client_id;

END $$;
