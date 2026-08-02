insert into public.organizations (id, name, slug) values ('10000000-0000-4000-8000-000000000001', 'Acme Labs', 'acme-labs') on conflict do nothing;

insert into public.policies (id, organization_id, name, version, status, source_text, parsed_rules) values (
  '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Hardware Procurement Policy', 3, 'active',
  'Hardware purchases are allowed from Merchant A, CDW, and Staples Business. Missions must not exceed $500 or 12 units. Sellers require a 4.2 rating. Purchases at or above $250 require manager approval.',
  '{"approvedMerchants":["Merchant A","CDW","Staples Business"],"maxBudgetCents":50000,"maxQuantity":12,"minSellerRating":4.2,"approvalThresholdCents":25000}'::jsonb
) on conflict do nothing;

insert into public.approved_merchants (organization_id, name, domain, category) values
('10000000-0000-4000-8000-000000000001','Merchant A','merchant-a.example.com','Computer accessories'),
('10000000-0000-4000-8000-000000000001','CDW','cdw.com','Enterprise technology'),
('10000000-0000-4000-8000-000000000001','Staples Business','staples.com','Office and accessories')
on conflict do nothing;

insert into public.missions (id, organization_id, title, source_prompt, status, policy_id, created_at) values (
  '20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','USB-C hubs for the product team',
  'Buy 8 reliable USB-C hubs under $350 total with 4K HDMI, 100W power delivery, Ethernet, two USB-A ports, Mac and Windows compatibility, delivered by August 18.',
  'AWAITING_APPROVAL','30000000-0000-4000-8000-000000000001','2026-08-01T17:42:00Z'
) on conflict do nothing;

insert into public.mission_requirements (mission_id, organization_id, requirements, confidence, confirmed_at) values (
  '20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
  '{"title":"USB-C hubs for the product team","category":"Computer accessories","quantity":8,"budgetCents":35000,"neededBy":"2026-08-18","specification":{"ports":["HDMI 4K","USB-C PD","2x USB-A","Ethernet"],"powerDeliveryWatts":100,"display":"4K at 60 Hz","compatibility":["macOS","Windows 11"]},"preferredMerchants":["Merchant A","CDW","Staples Business"],"notes":"Prioritize reliable chipsets and a minimum one-year warranty.","confidence":0.96}'::jsonb,
  .96,'2026-08-01T17:47:02Z'
) on conflict do nothing;

insert into public.offers (id, organization_id, merchant, seller, product_name, unit_price_cents, quantity, shipping_cents, delivery_date, approved_merchant, seller_rating, return_days, requirement_match) values
('offer-01','10000000-0000-4000-8000-000000000001','Merchant A','Merchant A','ApexLink Pro 9-in-1 USB-C Hub',3850,8,0,'2026-08-12',true,4.8,45,.99),
('offer-02','10000000-0000-4000-8000-000000000001','CDW','CDW','Belkin Connect 8-in-1 Hub',4299,8,0,'2026-08-13',true,4.7,30,.98),
('offer-03','10000000-0000-4000-8000-000000000001','Staples Business','Staples Business','HyperDrive Next 10-Port Hub',4199,8,0,'2026-08-15',true,4.6,30,.96),
('offer-04','10000000-0000-4000-8000-000000000001','Merchant A','Merchant A','Anker PowerExpand 8-in-1',3999,8,0,'2026-08-16',true,4.9,45,.95),
('offer-05','10000000-0000-4000-8000-000000000001','Amazon Marketplace','Orbit Tech Supply','NovaDock 12-Port USB-C Hub',2999,8,0,'2026-08-11',false,4.4,30,.91),
('offer-06','10000000-0000-4000-8000-000000000001','Best Buy Business','Best Buy Business','j5create Multi-Port Adapter',3699,8,0,'2026-08-14',false,4.5,15,.93),
('offer-07','10000000-0000-4000-8000-000000000001','CDW','CDW','Kensington UH1440P Hub',4799,8,0,'2026-08-12',true,4.8,60,.94),
('offer-08','10000000-0000-4000-8000-000000000001','Merchant A','Merchant A','Twelve South StayGo Mini',3499,8,0,'2026-08-20',true,4.6,45,.72),
('offer-09','10000000-0000-4000-8000-000000000001','Staples Business','Staples Business','StarTech 7-Port USB-C Hub',4599,8,0,'2026-08-17',true,4.9,30,.92),
('offer-10','10000000-0000-4000-8000-000000000001','Newegg Business','Newegg Business','Plugable 7-in-1 USB-C Hub',3399,8,0,'2026-08-13',false,4.7,30,.90),
('offer-11','10000000-0000-4000-8000-000000000001','Merchant A','Merchant A','ApexLink Essential 6-in-1',3299,8,0,'2026-08-12',true,4.1,30,.74),
('offer-12','10000000-0000-4000-8000-000000000001','CDW','CDW','Dell DA310 Mobile Adapter',5199,8,0,'2026-08-15',true,4.8,30,.88),
('offer-13','10000000-0000-4000-8000-000000000001','Amazon Marketplace','Orbit Tech Supply','DockForge USB-C Hub',2499,8,0,'2026-08-10',false,3.8,14,.84),
('offer-14','10000000-0000-4000-8000-000000000001','Staples Business','Staples Business','Logitech Logi Dock Flex Hub',4499,8,0,'2026-08-22',true,4.6,30,.97)
on conflict do nothing;

insert into public.activity_events (organization_id, mission_id, event_type, title, detail, actor_label, created_at) values
('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','mission.created','Mission created','Natural-language request received from Product & Design.','Maya Chen','2026-08-01T17:42:00Z'),
('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','requirements.confirmed','Requirements confirmed','8 hubs, $350 budget, required by August 18.','Maya Chen','2026-08-01T17:47:02Z'),
('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','policy.evaluated','14 offers evaluated','4 offers passed every policy rule.','Policy engine v3','2026-08-01T17:54:19Z'),
('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','decision.created','Best compliant offer selected','ApexLink Pro ranked first across six deterministic factors.','Decision engine','2026-08-01T17:55:48Z');
