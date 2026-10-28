import type { QuizScenario } from './fault-quiz';

/** Original practice questions; references checked October 2026, not an official NZTA test. */
export const knowledgeQuestions: QuizScenario[] = [
  {
    "id": "accident-001",
    "category": "accident",
    "scenario": "After a crash, you are not badly injured. What must you do first?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Leave if the car runs"
      },
      {
        "id": "b",
        "label": "Stop, check for injuries and help"
      },
      {
        "id": "c",
        "label": "Photograph every car first"
      },
      {
        "id": "d",
        "label": "Call your insurer before stopping"
      }
    ],
    "answerId": "b",
    "explanation": "Stop and check for injuries. Helping people takes priority over evidence collection.",
    "rule": "NZ accident response guidance",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driver-responsibility/crashes/"
  },
  {
    "id": "accident-002",
    "category": "accident",
    "scenario": "When must a driver report a crash involving an injury to Police?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Only if asked"
      },
      {
        "id": "b",
        "label": "Within seven days"
      },
      {
        "id": "c",
        "label": "As soon as possible and within 24 hours"
      },
      {
        "id": "d",
        "label": "After treatment ends"
      }
    ],
    "answerId": "c",
    "explanation": "Report as soon as possible, and no later than 24 hours after the crash.",
    "rule": "NZ accident response guidance",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driver-responsibility/crashes/"
  },
  {
    "id": "accident-003",
    "category": "accident",
    "scenario": "Which number should you call for urgent emergency assistance at a crash?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "111"
      },
      {
        "id": "b",
        "label": "An insurer's sales number"
      },
      {
        "id": "c",
        "label": "The council"
      },
      {
        "id": "d",
        "label": "A registration service"
      }
    ],
    "answerId": "a",
    "explanation": "Call 111 for an emergency requiring Police, Fire or Ambulance assistance.",
    "rule": "NZ accident response guidance",
    "sourceUrl": "https://www.police.govt.nz/use-105/traffic-crash-report"
  },
  {
    "id": "accident-004",
    "category": "accident",
    "scenario": "After a non-injury crash, what details must you give the relevant damaged-property owner or driver?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Banking password"
      },
      {
        "id": "b",
        "label": "Only your insurer"
      },
      {
        "id": "c",
        "label": "Only your car colour"
      },
      {
        "id": "d",
        "label": "Your name, address and registration plate number"
      }
    ],
    "answerId": "d",
    "explanation": "Give your name, address and registration plate number to the relevant person.",
    "rule": "NZ accident response guidance",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driver-responsibility/crashes/"
  },
  {
    "id": "accident-005",
    "category": "accident",
    "scenario": "You damage a fence in a non-injury crash. When must you give the owner your details?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "After the insurer investigates"
      },
      {
        "id": "b",
        "label": "As soon as possible and within 48 hours"
      },
      {
        "id": "c",
        "label": "Within a month"
      },
      {
        "id": "d",
        "label": "Only if witnessed"
      }
    ],
    "answerId": "b",
    "explanation": "Provide details as soon as possible, no later than 48 hours after the crash.",
    "rule": "NZ accident response guidance",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driver-responsibility/crashes/"
  },
  {
    "id": "accident-006",
    "category": "accident",
    "scenario": "You cannot find the owner of property damaged in your non-injury crash. What must you do?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Ignore minor damage"
      },
      {
        "id": "b",
        "label": "Wait to be contacted"
      },
      {
        "id": "c",
        "label": "Tell Police as soon as possible and within 60 hours"
      },
      {
        "id": "d",
        "label": "Wait until policy renewal"
      }
    ],
    "answerId": "c",
    "explanation": "If the relevant owner cannot be found, notify Police as soon as possible and within 60 hours.",
    "rule": "NZ accident response guidance",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driver-responsibility/crashes/"
  },
  {
    "id": "accident-007",
    "category": "accident",
    "scenario": "You crash a borrowed vehicle. If asked, what additional details must you provide?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "The vehicle owner's name and address"
      },
      {
        "id": "b",
        "label": "Their bank balance"
      },
      {
        "id": "c",
        "label": "Every service record"
      },
      {
        "id": "d",
        "label": "Their insurance password"
      }
    ],
    "answerId": "a",
    "explanation": "If you are not the vehicle owner, also give the owner's name and address when asked.",
    "rule": "NZ accident response guidance",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driver-responsibility/crashes/"
  },
  {
    "id": "accident-008",
    "category": "accident",
    "scenario": "When should you notify your insurer after a crash?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Only after prosecution"
      },
      {
        "id": "b",
        "label": "At renewal"
      },
      {
        "id": "c",
        "label": "After all repairs"
      },
      {
        "id": "d",
        "label": "As soon as possible"
      }
    ],
    "answerId": "d",
    "explanation": "NZTA advises telling your insurer as soon as possible after a crash.",
    "rule": "NZ accident response guidance",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driver-responsibility/crashes/"
  },
  {
    "id": "accident-009",
    "category": "accident",
    "scenario": "You approach a crash scene. How should you drive?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Accelerate"
      },
      {
        "id": "b",
        "label": "Slow down and drive carefully"
      },
      {
        "id": "c",
        "label": "Look only at damaged cars"
      },
      {
        "id": "d",
        "label": "Assume the road is clear"
      }
    ],
    "answerId": "b",
    "explanation": "The road may be blocked or have injured people on it. Slow down and take care.",
    "rule": "NZ accident response guidance",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driver-responsibility/crashes/"
  },
  {
    "id": "accident-010",
    "category": "accident",
    "scenario": "Police crash-site signs described in the Road Code require what speed until you pass the site?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "50 km/h"
      },
      {
        "id": "b",
        "label": "Normal open-road speed"
      },
      {
        "id": "c",
        "label": "20 km/h or less"
      },
      {
        "id": "d",
        "label": "Any speed with hazard lights"
      }
    ],
    "answerId": "c",
    "explanation": "The Police crash-site signs described by NZTA require 20 km/h or less until you pass the crash site.",
    "rule": "NZ accident response guidance",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driver-responsibility/crashes/"
  },
  {
    "id": "accident-011",
    "category": "accident",
    "scenario": "What does a reflective warning triangle beside the road warn of?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "A breakdown or crash ahead"
      },
      {
        "id": "b",
        "label": "Free parking"
      },
      {
        "id": "c",
        "label": "An insurance checkpoint"
      },
      {
        "id": "d",
        "label": "The end of restrictions"
      }
    ],
    "answerId": "a",
    "explanation": "A warning triangle alerts other road users to a breakdown or crash ahead.",
    "rule": "NZ accident response guidance",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driver-responsibility/crashes/"
  },
  {
    "id": "accident-012",
    "category": "accident",
    "scenario": "What is the Police online traffic crash report intended for?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Immediate rescue"
      },
      {
        "id": "b",
        "label": "Urgent attendance at the scene"
      },
      {
        "id": "c",
        "label": "An injury emergency instead of 111"
      },
      {
        "id": "d",
        "label": "Non-injury traffic crashes"
      }
    ],
    "answerId": "d",
    "explanation": "Use online reporting for non-injury crashes, not as a substitute for an emergency response.",
    "rule": "NZ accident response guidance",
    "sourceUrl": "https://www.police.govt.nz/use-105/traffic-crash-report"
  },
  {
    "id": "accident-013",
    "category": "accident",
    "scenario": "What does Police advise motorists to exchange after a minor non-injury crash?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "PINs"
      },
      {
        "id": "b",
        "label": "Names and addresses"
      },
      {
        "id": "c",
        "label": "Passwords"
      },
      {
        "id": "d",
        "label": "Only opinions on fault"
      }
    ],
    "answerId": "b",
    "explanation": "Exchange names and addresses. NZTA also specifies plate numbers and other reporting duties.",
    "rule": "NZ accident response guidance",
    "sourceUrl": "https://www.police.govt.nz/faq/what-should-i-do-if-ive-been-involved-in-a-minor-car-crash"
  },
  {
    "id": "accident-014",
    "category": "accident",
    "scenario": "Does the 24-hour injury-crash reporting limit mean you should wait 24 hours?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Yes"
      },
      {
        "id": "b",
        "label": "Reporting is optional"
      },
      {
        "id": "c",
        "label": "No, report as soon as possible"
      },
      {
        "id": "d",
        "label": "An insurance report replaces it"
      }
    ],
    "answerId": "c",
    "explanation": "Twenty-four hours is the outer limit, not permission to delay. Report as soon as possible.",
    "rule": "NZ accident response guidance",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driver-responsibility/crashes/"
  },
  {
    "id": "accident-015",
    "category": "accident",
    "scenario": "After a non-injury crash damages another vehicle, who should receive your required details?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Its owner or driver"
      },
      {
        "id": "b",
        "label": "Only your mechanic"
      },
      {
        "id": "c",
        "label": "A social media group"
      },
      {
        "id": "d",
        "label": "The manufacturer"
      }
    ],
    "answerId": "a",
    "explanation": "Provide the required details to the owner or driver of the damaged vehicle within the required timeframe.",
    "rule": "NZ accident response guidance",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driver-responsibility/crashes/"
  },
  {
    "id": "accident-016",
    "category": "accident",
    "scenario": "Taking crash photographs would mean standing in live traffic. What should you do?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Stand there briefly"
      },
      {
        "id": "b",
        "label": "Delay helping people"
      },
      {
        "id": "c",
        "label": "Treat evidence as more important"
      },
      {
        "id": "d",
        "label": "Collect photographs only when safe"
      }
    ],
    "answerId": "d",
    "explanation": "Safety and helping injured people come first. Do not risk injury to collect evidence.",
    "rule": "NZ accident response guidance",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driver-responsibility/crashes/"
  },
  {
    "id": "accident-017",
    "category": "accident",
    "scenario": "What can substantiate an insured loss after a crash?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Invented receipts"
      },
      {
        "id": "b",
        "label": "Genuine receipts or invoices"
      },
      {
        "id": "c",
        "label": "Exaggerated costs"
      },
      {
        "id": "d",
        "label": "Unsupported comments"
      }
    ],
    "answerId": "b",
    "explanation": "Genuine receipts, invoices and proof of purchase can support a claim. Provide accurate information.",
    "rule": "NZ accident response guidance",
    "sourceUrl": "https://www.icnz.org.nz/individuals/making-a-claim/"
  },
  {
    "id": "accident-018",
    "category": "accident",
    "scenario": "How can safely taken photographs of crash damage help?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Automatically prove liability"
      },
      {
        "id": "b",
        "label": "Replace reporting duties"
      },
      {
        "id": "c",
        "label": "Support evidence of loss"
      },
      {
        "id": "d",
        "label": "Guarantee every cost is covered"
      }
    ],
    "answerId": "c",
    "explanation": "Photographs can support a claim but do not determine liability or guarantee coverage on their own.",
    "rule": "NZ accident response guidance",
    "sourceUrl": "https://www.icnz.org.nz/individuals/making-a-claim/"
  },
  {
    "id": "accident-019",
    "category": "accident",
    "scenario": "Which identifier should you find when starting an insurance claim?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Your policy number"
      },
      {
        "id": "b",
        "label": "A neighbour's plate"
      },
      {
        "id": "c",
        "label": "Banking password"
      },
      {
        "id": "d",
        "label": "A mechanic's tax code"
      }
    ],
    "answerId": "a",
    "explanation": "Find your policy number so your insurer can identify the relevant cover.",
    "rule": "NZ accident response guidance",
    "sourceUrl": "https://www.icnz.org.nz/individuals/making-a-claim/"
  },
  {
    "id": "accident-020",
    "category": "accident",
    "scenario": "Before assuming a crash cost is insured, what should you check?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "The other car's colour"
      },
      {
        "id": "b",
        "label": "A friend's payout"
      },
      {
        "id": "c",
        "label": "Another insurer's advert"
      },
      {
        "id": "d",
        "label": "Your policy wording, terms and add-ons"
      }
    ],
    "answerId": "d",
    "explanation": "Your actual policy wording, including special terms and add-ons, determines the cover available.",
    "rule": "NZ accident response guidance",
    "sourceUrl": "https://www.icnz.org.nz/individuals/making-a-claim/"
  },
  {
    "id": "privacy-021",
    "category": "privacy",
    "scenario": "Can a photograph identifying you be personal information without your name on it?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "No"
      },
      {
        "id": "b",
        "label": "Yes"
      },
      {
        "id": "c",
        "label": "Only with a signature"
      },
      {
        "id": "d",
        "label": "Only when printed"
      }
    ],
    "answerId": "b",
    "explanation": "Personal information is about an identifiable person. Identification need not be by name.",
    "rule": "Privacy Act 2020 — OPC guidance",
    "sourceUrl": "https://www.privacy.org.nz/your-rights/your-privacy-rights/"
  },
  {
    "id": "privacy-022",
    "category": "privacy",
    "scenario": "Which privacy principle gives access to your own personal information?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "A court-only rule"
      },
      {
        "id": "b",
        "label": "A medical-only rule"
      },
      {
        "id": "c",
        "label": "Principle 6"
      },
      {
        "id": "d",
        "label": "A rule needing every customer's consent"
      }
    ],
    "answerId": "c",
    "explanation": "Principle 6 gives a right to request access to personal information about yourself, subject to lawful withholding.",
    "rule": "Privacy Act 2020 — OPC guidance",
    "sourceUrl": "https://www.privacy.org.nz/privacy-principles/6/"
  },
  {
    "id": "privacy-023",
    "category": "privacy",
    "scenario": "Does a claim give unrestricted access to another driver's entire personal file?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "No, your right concerns your own information"
      },
      {
        "id": "b",
        "label": "Yes with their plate"
      },
      {
        "id": "c",
        "label": "Yes if fault is disputed"
      },
      {
        "id": "d",
        "label": "Yes with a high excess"
      }
    ],
    "answerId": "a",
    "explanation": "Your access right concerns your information, not unrestricted access to someone else's file.",
    "rule": "Privacy Act 2020 — OPC guidance",
    "sourceUrl": "https://www.privacy.org.nz/privacy-principles/6/"
  },
  {
    "id": "privacy-024",
    "category": "privacy",
    "scenario": "What is the usual deadline to decide and notify you of a personal-information access response, subject to lawful extensions?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Two calendar days"
      },
      {
        "id": "b",
        "label": "Six months"
      },
      {
        "id": "c",
        "label": "At the next audit"
      },
      {
        "id": "d",
        "label": "As soon as reasonably practicable and within 20 working days"
      }
    ],
    "answerId": "d",
    "explanation": "The usual decision and notification deadline is 20 working days. Lawful extensions may apply; release follows without undue delay.",
    "rule": "Privacy Act 2020 — OPC guidance",
    "sourceUrl": "https://www.privacy.org.nz/responsibilities/holding/"
  },
  {
    "id": "privacy-025",
    "category": "privacy",
    "scenario": "Can information ever lawfully be withheld from an access request?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Never"
      },
      {
        "id": "b",
        "label": "Yes, if a statutory withholding ground applies"
      },
      {
        "id": "c",
        "label": "Whenever inconvenient"
      },
      {
        "id": "d",
        "label": "Whenever the requester is disliked"
      }
    ],
    "answerId": "b",
    "explanation": "Access is subject to statutory withholding grounds, not a blanket right to every record unedited.",
    "rule": "Privacy Act 2020 — OPC guidance",
    "sourceUrl": "https://www.privacy.org.nz/privacy-principles/6/"
  },
  {
    "id": "privacy-026",
    "category": "privacy",
    "scenario": "Which may justify withholding part of a claim record?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "It is digital"
      },
      {
        "id": "b",
        "label": "The claim is small"
      },
      {
        "id": "c",
        "label": "An unwarranted breach of another person's privacy"
      },
      {
        "id": "d",
        "label": "The requester paid an excess"
      }
    ],
    "answerId": "c",
    "explanation": "A statutory ground can protect another person's privacy. It must actually apply to the information withheld.",
    "rule": "Privacy Act 2020 — OPC guidance",
    "sourceUrl": "https://www.privacy.org.nz/privacy-principles/6/"
  },
  {
    "id": "privacy-027",
    "category": "privacy",
    "scenario": "An insurer has your address wrong. What can you request?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Correction of your information"
      },
      {
        "id": "b",
        "label": "Ownership of its database"
      },
      {
        "id": "c",
        "label": "Deletion of everyone's files"
      },
      {
        "id": "d",
        "label": "Unauthorised system access"
      }
    ],
    "answerId": "a",
    "explanation": "Principle 7 gives you the right to request correction of personal information about you.",
    "rule": "Privacy Act 2020 — OPC guidance",
    "sourceUrl": "https://www.privacy.org.nz/privacy-principles/7/"
  },
  {
    "id": "privacy-028",
    "category": "privacy",
    "scenario": "An organisation declines your correction request. What can you ask for?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "All records cancelled"
      },
      {
        "id": "b",
        "label": "Automatic damages"
      },
      {
        "id": "c",
        "label": "Someone else's full file"
      },
      {
        "id": "d",
        "label": "A statement of correction attached to the information"
      }
    ],
    "answerId": "d",
    "explanation": "You may ask for a statement of correction to be attached, and the organisation must take reasonable steps to do so.",
    "rule": "Privacy Act 2020 — OPC guidance",
    "sourceUrl": "https://www.privacy.org.nz/privacy-principles/7/"
  },
  {
    "id": "privacy-029",
    "category": "privacy",
    "scenario": "Must an organisation always replace its account of events with your preferred correction?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Yes despite contrary evidence"
      },
      {
        "id": "b",
        "label": "No, it may disagree; a correction statement can be attached"
      },
      {
        "id": "c",
        "label": "Yes if legally worded"
      },
      {
        "id": "d",
        "label": "Correction requests are never allowed"
      }
    ],
    "answerId": "b",
    "explanation": "It must consider a correction request but need not adopt your account if it disagrees. You can request a correction statement.",
    "rule": "Privacy Act 2020 — OPC guidance",
    "sourceUrl": "https://www.privacy.org.nz/privacy-principles/7/"
  },
  {
    "id": "privacy-030",
    "category": "privacy",
    "scenario": "Which statement about sharing personal information is correct?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Consent is always required"
      },
      {
        "id": "b",
        "label": "Any claim file can be published"
      },
      {
        "id": "c",
        "label": "Authorisation is one lawful basis; other permitted grounds can apply"
      },
      {
        "id": "d",
        "label": "Police can never receive information"
      }
    ],
    "answerId": "c",
    "explanation": "Principle 11 permits certain disclosures without consent when its purpose requirements or exceptions are met.",
    "rule": "Privacy Act 2020 — OPC guidance",
    "sourceUrl": "https://www.privacy.org.nz/privacy-principles/11/"
  },
  {
    "id": "privacy-031",
    "category": "privacy",
    "scenario": "Which disclosure fits the general purpose rule in privacy principle 11?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "For the original or a directly related purpose"
      },
      {
        "id": "b",
        "label": "Public release because it is interesting"
      },
      {
        "id": "c",
        "label": "Unrelated sale without a lawful basis"
      },
      {
        "id": "d",
        "label": "Sharing all records with a stranger"
      }
    ],
    "answerId": "a",
    "explanation": "Disclosure for the purpose of collection or a directly related purpose is generally permitted, alongside specific exceptions.",
    "rule": "Privacy Act 2020 — OPC guidance",
    "sourceUrl": "https://www.privacy.org.nz/privacy-principles/11/"
  },
  {
    "id": "privacy-032",
    "category": "privacy",
    "scenario": "Could information be disclosed without consent to address a serious safety threat?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Never"
      },
      {
        "id": "b",
        "label": "Only by publishing online"
      },
      {
        "id": "c",
        "label": "Only if every customer agrees"
      },
      {
        "id": "d",
        "label": "Potentially, if the relevant exception's requirements are met"
      }
    ],
    "answerId": "d",
    "explanation": "A serious health or safety threat exception may permit disclosure. Its requirements must be met; it is not blanket permission.",
    "rule": "Privacy Act 2020 — OPC guidance",
    "sourceUrl": "https://www.privacy.org.nz/privacy-principles/11/"
  },
  {
    "id": "privacy-033",
    "category": "privacy",
    "scenario": "How should organisations protect personal information in claim files?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Unrestricted staff access"
      },
      {
        "id": "b",
        "label": "Appropriate safeguards against loss, misuse and unauthorised access"
      },
      {
        "id": "c",
        "label": "Publish the files"
      },
      {
        "id": "d",
        "label": "Remove passwords"
      }
    ],
    "answerId": "b",
    "explanation": "Organisations must safeguard personal information, with suitable storage, access controls and secure transfers.",
    "rule": "Privacy Act 2020 — OPC guidance",
    "sourceUrl": "https://www.privacy.org.nz/responsibilities/holding/"
  },
  {
    "id": "privacy-034",
    "category": "privacy",
    "scenario": "What should you generally do before complaining to the Privacy Commissioner?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Pay a court fee"
      },
      {
        "id": "b",
        "label": "Publish all records"
      },
      {
        "id": "c",
        "label": "Complain to the organisation first"
      },
      {
        "id": "d",
        "label": "Wait until the policy expires"
      }
    ],
    "answerId": "c",
    "explanation": "Raise the privacy concern with the organisation first so it can try to resolve it.",
    "rule": "Privacy Act 2020 — OPC guidance",
    "sourceUrl": "https://www.privacy.org.nz/your-rights/your-privacy-rights/"
  },
  {
    "id": "privacy-035",
    "category": "privacy",
    "scenario": "What is the fee to complain to the NZ Privacy Commissioner?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "No complaint fee"
      },
      {
        "id": "b",
        "label": "A percentage of the claim"
      },
      {
        "id": "c",
        "label": "Mandatory legal fees"
      },
      {
        "id": "d",
        "label": "Your insurance excess"
      }
    ],
    "answerId": "a",
    "explanation": "The Office of the Privacy Commissioner provides a free privacy complaint process.",
    "rule": "Privacy Act 2020 — OPC guidance",
    "sourceUrl": "https://www.privacy.org.nz/your-rights/your-privacy-rights/"
  },
  {
    "id": "insurance-036",
    "category": "insurance",
    "scenario": "What does basic third-party property motor insurance principally cover?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Every breakdown"
      },
      {
        "id": "b",
        "label": "All damage to your own car"
      },
      {
        "id": "c",
        "label": "Servicing"
      },
      {
        "id": "d",
        "label": "Covered liability for damage you cause to others' vehicles or property"
      }
    ],
    "answerId": "d",
    "explanation": "Third-party property cover principally protects against covered liability for damage to others, subject to terms.",
    "rule": "NZ insurance guidance — check your policy",
    "sourceUrl": "https://www.consumerprotection.govt.nz/help-product-service/cars/paying-registering-insuring-car/car-insurance"
  },
  {
    "id": "insurance-037",
    "category": "insurance",
    "scenario": "What does third-party, fire and theft add to basic third-party cover?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Every breakdown"
      },
      {
        "id": "b",
        "label": "Fire damage to or theft of your vehicle, subject to terms"
      },
      {
        "id": "c",
        "label": "Traffic fines"
      },
      {
        "id": "d",
        "label": "Worn tyres"
      }
    ],
    "answerId": "b",
    "explanation": "This policy type adds fire and theft protection for your vehicle, not all accidental damage to it.",
    "rule": "NZ insurance guidance — check your policy",
    "sourceUrl": "https://www.consumerprotection.govt.nz/help-product-service/cars/paying-registering-insuring-car/car-insurance"
  },
  {
    "id": "insurance-038",
    "category": "insurance",
    "scenario": "Which description best fits comprehensive motor insurance?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Only fence damage"
      },
      {
        "id": "b",
        "label": "Every expense without exclusions"
      },
      {
        "id": "c",
        "label": "Generally own-car accidental damage and covered damage to others, subject to terms"
      },
      {
        "id": "d",
        "label": "A servicing plan"
      }
    ],
    "answerId": "c",
    "explanation": "Comprehensive cover is broader, but exclusions, limits, conditions and excesses still apply.",
    "rule": "NZ insurance guidance — check your policy",
    "sourceUrl": "https://www.icnz.org.nz/individuals/motor/"
  },
  {
    "id": "insurance-039",
    "category": "insurance",
    "scenario": "What does market value generally mean for a damaged vehicle?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Its value immediately before the loss"
      },
      {
        "id": "b",
        "label": "Always the purchase price"
      },
      {
        "id": "c",
        "label": "A brand-new replacement price"
      },
      {
        "id": "d",
        "label": "Whatever the owner chooses"
      }
    ],
    "answerId": "a",
    "explanation": "Market value is what the vehicle was worth immediately before the loss, assessed under the policy.",
    "rule": "NZ insurance guidance — check your policy",
    "sourceUrl": "https://www.consumerprotection.govt.nz/help-product-service/cars/paying-registering-insuring-car/car-insurance"
  },
  {
    "id": "insurance-040",
    "category": "insurance",
    "scenario": "What is agreed-value motor insurance?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "The other driver's estimate"
      },
      {
        "id": "b",
        "label": "A figure that never changes"
      },
      {
        "id": "c",
        "label": "Any new vehicle you choose"
      },
      {
        "id": "d",
        "label": "A value agreed with the insurer at inception and renewal"
      }
    ],
    "answerId": "d",
    "explanation": "Agreed value is set with the insurer at inception and renewal. Conditions and deductions may still affect settlement.",
    "rule": "NZ insurance guidance — check your policy",
    "sourceUrl": "https://www.consumerprotection.govt.nz/help-product-service/cars/paying-registering-insuring-car/car-insurance"
  },
  {
    "id": "insurance-041",
    "category": "insurance",
    "scenario": "A market-value policy lists a sum insured above the assessed market value. Is the higher figure necessarily paid?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Yes, all sums insured are agreed values"
      },
      {
        "id": "b",
        "label": "No, market-value terms, limits and deductions determine settlement"
      },
      {
        "id": "c",
        "label": "Yes if the car is old"
      },
      {
        "id": "d",
        "label": "Yes if premiums are monthly"
      }
    ],
    "answerId": "b",
    "explanation": "A listed sum insured does not convert a market-value policy into agreed-value cover.",
    "rule": "NZ insurance guidance — check your policy",
    "sourceUrl": "https://www.ifso.nz/pages/car-insurance-payments"
  },
  {
    "id": "insurance-042",
    "category": "insurance",
    "scenario": "Why check the agreed-value figure at renewal?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Renewal removes the excess"
      },
      {
        "id": "b",
        "label": "It always increases"
      },
      {
        "id": "c",
        "label": "It may have changed for the new period"
      },
      {
        "id": "d",
        "label": "All policies become third-party"
      }
    ],
    "answerId": "c",
    "explanation": "The agreed value may change at renewal. Read the new schedule rather than assuming the old figure continues.",
    "rule": "NZ insurance guidance — check your policy",
    "sourceUrl": "https://www.ifso.nz/pages/car-insurance-payments"
  },
  {
    "id": "insurance-043",
    "category": "insurance",
    "scenario": "What is an insurance premium?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "The price paid for cover"
      },
      {
        "id": "b",
        "label": "A Police reporting fee"
      },
      {
        "id": "c",
        "label": "The same as an excess"
      },
      {
        "id": "d",
        "label": "A guaranteed payout"
      }
    ],
    "answerId": "a",
    "explanation": "The premium is the price of insurance cover, separate from your contribution to a claim.",
    "rule": "NZ insurance guidance — check your policy",
    "sourceUrl": "https://www.consumerprotection.govt.nz/help-product-service/cars/paying-registering-insuring-car/car-insurance"
  },
  {
    "id": "insurance-044",
    "category": "insurance",
    "scenario": "What is an insurance excess?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "A claim reward"
      },
      {
        "id": "b",
        "label": "All premiums refunded"
      },
      {
        "id": "c",
        "label": "A Police penalty"
      },
      {
        "id": "d",
        "label": "Your contribution towards a claim under the policy"
      }
    ],
    "answerId": "d",
    "explanation": "An excess is the amount you contribute when claiming, as specified in the policy.",
    "rule": "NZ insurance guidance — check your policy",
    "sourceUrl": "https://www.ifso.nz/pages/excess"
  },
  {
    "id": "insurance-045",
    "category": "insurance",
    "scenario": "Another driver caused your crash. Is your own-policy excess automatically waived?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Always"
      },
      {
        "id": "b",
        "label": "No, waiver or refund depends on policy conditions and circumstances"
      },
      {
        "id": "c",
        "label": "Yes if upset"
      },
      {
        "id": "d",
        "label": "Yes for expensive damage"
      }
    ],
    "answerId": "b",
    "explanation": "Fault alone does not guarantee a waiver. Check the policy's identification, responsibility and recovery requirements.",
    "rule": "NZ insurance guidance — check your policy",
    "sourceUrl": "https://www.ifso.nz/information/vehicle-insurance"
  },
  {
    "id": "insurance-046",
    "category": "insurance",
    "scenario": "Your stolen car's offender is identified. Is the excess automatically cancelled?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Always"
      },
      {
        "id": "b",
        "label": "Theft never has an excess"
      },
      {
        "id": "c",
        "label": "No, the policy may still require it"
      },
      {
        "id": "d",
        "label": "Only the offender decides"
      }
    ],
    "answerId": "c",
    "explanation": "An excess can remain payable on a theft claim even if an offender is identified and charged.",
    "rule": "NZ insurance guidance — check your policy",
    "sourceUrl": "https://www.ifso.nz/pages/excess"
  },
  {
    "id": "insurance-047",
    "category": "insurance",
    "scenario": "Why read all excess provisions, not just the headline standard excess?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Different or additional excesses may apply"
      },
      {
        "id": "b",
        "label": "Every policy has only one excess"
      },
      {
        "id": "c",
        "label": "Police set excesses"
      },
      {
        "id": "d",
        "label": "The standard excess never applies"
      }
    ],
    "answerId": "a",
    "explanation": "Policies can include different or additional excesses. Read the wording to find which amounts apply.",
    "rule": "NZ insurance guidance — check your policy",
    "sourceUrl": "https://www.ifso.nz/pages/excess"
  },
  {
    "id": "insurance-048",
    "category": "insurance",
    "scenario": "Are windscreen claims excess-free under every motor policy?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Always"
      },
      {
        "id": "b",
        "label": "Whenever cracked"
      },
      {
        "id": "c",
        "label": "If no other car was involved"
      },
      {
        "id": "d",
        "label": "No, check the policy and any glass add-on"
      }
    ],
    "answerId": "d",
    "explanation": "Some policies have excess-free glass cover. It is not a universal legal entitlement.",
    "rule": "NZ insurance guidance — check your policy",
    "sourceUrl": "https://www.icnz.org.nz/individuals/making-a-claim/"
  },
  {
    "id": "insurance-049",
    "category": "insurance",
    "scenario": "Does every comprehensive policy provide a temporary replacement car during repairs?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Yes without limits"
      },
      {
        "id": "b",
        "label": "No, check benefits, limits, conditions and add-ons"
      },
      {
        "id": "c",
        "label": "Yes whenever an excess is paid"
      },
      {
        "id": "d",
        "label": "Police supply it"
      }
    ],
    "answerId": "b",
    "explanation": "Hire or courtesy-car benefits vary. A policy benefit is separate from any potential claim against another party.",
    "rule": "NZ insurance guidance — check your policy",
    "sourceUrl": "https://www.icnz.org.nz/individuals/motor/"
  },
  {
    "id": "insurance-050",
    "category": "insurance",
    "scenario": "You dispute your insurer's vehicle valuation. What may help?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "An invented price"
      },
      {
        "id": "b",
        "label": "Assuming your figure must be accepted"
      },
      {
        "id": "c",
        "label": "An independent valuation"
      },
      {
        "id": "d",
        "label": "Ignoring the policy"
      }
    ],
    "answerId": "c",
    "explanation": "An independent valuation may help support your challenge to a vehicle valuation.",
    "rule": "NZ insurance guidance — check your policy",
    "sourceUrl": "https://www.ifso.nz/information/vehicle-insurance"
  },
  {
    "id": "insurance-051",
    "category": "insurance",
    "scenario": "Does a current WoF guarantee an insurer cannot question roadworthiness after a crash?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "No, the vehicle may still be unsafe"
      },
      {
        "id": "b",
        "label": "Yes, it guarantees claims"
      },
      {
        "id": "c",
        "label": "Yes until renewal"
      },
      {
        "id": "d",
        "label": "WoFs have no safety relevance"
      }
    ],
    "answerId": "a",
    "explanation": "A current warrant does not guarantee roadworthiness at the time of a crash. Unsafe condition can affect claims under applicable terms and law.",
    "rule": "NZ insurance guidance — check your policy",
    "sourceUrl": "https://www.ifso.nz/information/vehicle-insurance"
  },
  {
    "id": "insurance-052",
    "category": "insurance",
    "scenario": "How should you answer application, renewal and claim questions?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Hide relevant facts"
      },
      {
        "id": "b",
        "label": "Guess"
      },
      {
        "id": "c",
        "label": "Copy a friend's answers"
      },
      {
        "id": "d",
        "label": "Honestly, with complete, relevant and current information"
      }
    ],
    "answerId": "d",
    "explanation": "Answer honestly and accurately. Ask the insurer when unsure and correct relevant omitted information.",
    "rule": "NZ insurance guidance — check your policy",
    "sourceUrl": "https://www.consumerprotection.govt.nz/help-product-service/managing-money/insurance"
  },
  {
    "id": "insurance-053",
    "category": "insurance",
    "scenario": "What is normally the first step when disputing an insurer's claim decision?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Assume it is final"
      },
      {
        "id": "b",
        "label": "Complain to the insurer and let it try to resolve the issue"
      },
      {
        "id": "c",
        "label": "Destroy documents"
      },
      {
        "id": "d",
        "label": "Ask Police to rewrite the policy"
      }
    ],
    "answerId": "b",
    "explanation": "Use the insurer's internal complaints process first, before approaching its external dispute resolution scheme.",
    "rule": "NZ insurance guidance — check your policy",
    "sourceUrl": "https://www.ifso.nz/complaints"
  },
  {
    "id": "insurance-054",
    "category": "insurance",
    "scenario": "What should you check before asking IFSO to investigate your insurance complaint?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "The car colour"
      },
      {
        "id": "b",
        "label": "Whether the other driver uses it"
      },
      {
        "id": "c",
        "label": "Whether your insurer participates in IFSO"
      },
      {
        "id": "d",
        "label": "Whether you have a second policy"
      }
    ],
    "answerId": "c",
    "explanation": "IFSO considers complaints about participating providers within its jurisdiction. Other providers may use a different scheme.",
    "rule": "NZ insurance guidance — check your policy",
    "sourceUrl": "https://www.ifso.nz/complaints"
  },
  {
    "id": "insurance-055",
    "category": "insurance",
    "scenario": "What does IFSO charge consumers for its complaint service?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Nothing"
      },
      {
        "id": "b",
        "label": "The disputed claim value"
      },
      {
        "id": "c",
        "label": "A settlement percentage"
      },
      {
        "id": "d",
        "label": "The policy excess"
      }
    ],
    "answerId": "a",
    "explanation": "The IFSO dispute resolution service is free to consumers, subject to its complaints process and jurisdiction.",
    "rule": "NZ insurance guidance — check your policy",
    "sourceUrl": "https://www.ifso.nz/pages/frequently-asked-questions"
  },
  {
    "id": "driving-001",
    "category": "driving",
    "scenario": "At an uncontrolled crossroads, you are turning left while an approaching vehicle opposite you continues straight. Your paths conflict. What should you do?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Turn because left turns have priority"
      },
      {
        "id": "b",
        "label": "Give way to the straight-through vehicle"
      },
      {
        "id": "c",
        "label": "Sound your horn and turn"
      },
      {
        "id": "d",
        "label": "Expect the other vehicle to stop"
      }
    ],
    "answerId": "b",
    "explanation": "Turning traffic gives way to traffic that is not turning.",
    "rule": "NZ Road Code — Intersection give way",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driving/giving-way/the-give-way-rules/"
  },
  {
    "id": "driving-002",
    "category": "driving",
    "scenario": "You and an opposing driver both face green circular lights. You turn right and they turn left into the same road. Who gives way?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "The left-turning driver"
      },
      {
        "id": "b",
        "label": "Whoever arrived last"
      },
      {
        "id": "c",
        "label": "You, as the right-turning driver"
      },
      {
        "id": "d",
        "label": "Whoever has the smaller vehicle"
      }
    ],
    "answerId": "c",
    "explanation": "When facing the same control, right-turning traffic gives way to opposing left-turning traffic.",
    "rule": "NZ Road Code — Intersection give way",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driving/giving-way/the-give-way-rules/"
  },
  {
    "id": "driving-003",
    "category": "driving",
    "scenario": "You reach the bottom of an uncontrolled T-intersection. What is your obligation?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Give way to traffic on the continuing road"
      },
      {
        "id": "b",
        "label": "Give way only to traffic from your right"
      },
      {
        "id": "c",
        "label": "Proceed before turning vehicles on the continuing road"
      },
      {
        "id": "d",
        "label": "Stop only if another vehicle sounds its horn"
      }
    ],
    "answerId": "a",
    "explanation": "Traffic on a terminating road gives way to traffic on the continuing road.",
    "rule": "NZ Road Code — Intersection give way",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driving/giving-way/the-give-way-rules/"
  },
  {
    "id": "driving-004",
    "category": "driving",
    "scenario": "Two vehicles approach an uncontrolled crossroads on intersecting roads, both travelling straight. The other vehicle is on your right. What should you do?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Accelerate through"
      },
      {
        "id": "b",
        "label": "Use vehicle size to decide priority"
      },
      {
        "id": "c",
        "label": "Proceed because neither vehicle is turning"
      },
      {
        "id": "d",
        "label": "Give way to the vehicle on your right"
      }
    ],
    "answerId": "d",
    "explanation": "Where no other give-way rule resolves the situation, give way to your right.",
    "rule": "NZ Road Code — Intersection give way",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driving/giving-way/the-give-way-rules/"
  },
  {
    "id": "driving-005",
    "category": "driving",
    "scenario": "While leaving a driveway, you encounter a pedestrian on the footpath and a car on the road. Who must you give way to?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Only the car"
      },
      {
        "id": "b",
        "label": "Both the pedestrian and the car"
      },
      {
        "id": "c",
        "label": "Only the pedestrian"
      },
      {
        "id": "d",
        "label": "Neither if you move slowly"
      }
    ],
    "answerId": "b",
    "explanation": "Drivers leaving a driveway give way to road traffic and users of the footpath or other paths crossed.",
    "rule": "NZ Road Code — Intersection give way",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driving/giving-way/the-give-way-rules/"
  },
  {
    "id": "driving-006",
    "category": "driving",
    "scenario": "At an uncontrolled intersection, the marked centre line bends left. You continue physically straight, leaving its path. What applies?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "You always have priority because you are physically straight"
      },
      {
        "id": "b",
        "label": "Only the right-hand rule applies"
      },
      {
        "id": "c",
        "label": "You are legally turning and must give way to vehicles following the centre line"
      },
      {
        "id": "d",
        "label": "The centre line has no relevance"
      }
    ],
    "answerId": "c",
    "explanation": "Leaving the path of the marked centre line counts as turning.",
    "rule": "NZ Road Code — Intersection give way",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driving/giving-way/the-give-way-rules/"
  },
  {
    "id": "driving-007",
    "category": "driving",
    "scenario": "What does giving way require when another road user has priority?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Let them continue without evasive action caused by you"
      },
      {
        "id": "b",
        "label": "Make them slow down only slightly"
      },
      {
        "id": "c",
        "label": "Wave them through while moving into their path"
      },
      {
        "id": "d",
        "label": "Stop only if they are driving a motor vehicle"
      }
    ],
    "answerId": "a",
    "explanation": "The priority road user should not need to brake, swerve or otherwise avoid you.",
    "rule": "NZ Road Code — Intersection give way",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driving/giving-way/the-give-way-rules/"
  },
  {
    "id": "driving-008",
    "category": "driving",
    "scenario": "All approaches to a crossroads show flashing yellow lights. Both you and a vehicle on your right intend to travel straight. What should you do?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Treat your light as green"
      },
      {
        "id": "b",
        "label": "Wait for a green light indefinitely"
      },
      {
        "id": "c",
        "label": "Proceed first if your road is wider"
      },
      {
        "id": "d",
        "label": "Apply the give-way rules and give way to the vehicle on your right"
      }
    ],
    "answerId": "d",
    "explanation": "Flashing yellow signals require caution and application of the give-way rules.",
    "rule": "NZ Road Code — Intersection give way",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driving/giving-way/the-give-way-rules/"
  },
  {
    "id": "driving-009",
    "category": "driving",
    "scenario": "Your light is green, but a queue leaves no room beyond the intersection. You intend to continue straight. What should you do?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Enter and wait across the intersection"
      },
      {
        "id": "b",
        "label": "Wait before entering until there is space beyond it"
      },
      {
        "id": "c",
        "label": "Enter if the driver behind sounds their horn"
      },
      {
        "id": "d",
        "label": "Stop on the pedestrian crossing instead"
      }
    ],
    "answerId": "b",
    "explanation": "A green signal does not permit entering an intersection that you cannot clear.",
    "rule": "NZ Road Code — Intersection give way",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driving/stopping-and-parking/stopping-at-intersections-railway-level-crossings-and-pedestrian-crossings/"
  },
  {
    "id": "driving-010",
    "category": "driving",
    "scenario": "You turn left across a cycle lane while a cyclist continues straight alongside you. What must you do?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Turn ahead of the cyclist because cars have priority"
      },
      {
        "id": "b",
        "label": "Require the cyclist to stop"
      },
      {
        "id": "c",
        "label": "Give way to the cyclist before crossing their path"
      },
      {
        "id": "d",
        "label": "Use your indicator to claim priority"
      }
    ],
    "answerId": "c",
    "explanation": "Turning vehicles give way to cyclists continuing straight, including in cycle lanes.",
    "rule": "NZ Road Code — Intersection give way",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driving/giving-way/the-give-way-rules/"
  },
  {
    "id": "driving-011",
    "category": "driving",
    "scenario": "After a rest stop, you rejoin a quiet two-way road. Which side should you use?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "The left side"
      },
      {
        "id": "b",
        "label": "The right side until another vehicle appears"
      },
      {
        "id": "c",
        "label": "Whichever side has fewer bends"
      },
      {
        "id": "d",
        "label": "The centre of the road"
      }
    ],
    "answerId": "a",
    "explanation": "New Zealand traffic drives on the left.",
    "rule": "NZ Road Code — Keeping left",
    "sourceUrl": "https://www.nzta.govt.nz/assets/resources/driving-in-nz/docs/driving-in-nz.pdf"
  },
  {
    "id": "driving-012",
    "category": "driving",
    "scenario": "A narrow two-way road has no centre line. How should you position your car?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Always straddle the middle"
      },
      {
        "id": "b",
        "label": "Use the right-hand side"
      },
      {
        "id": "c",
        "label": "Choose either side"
      },
      {
        "id": "d",
        "label": "Keep left despite the absence of markings"
      }
    ],
    "answerId": "d",
    "explanation": "The keep-left rule also applies on unmarked roads.",
    "rule": "NZ Road Code — Keeping left",
    "sourceUrl": "https://www.nzta.govt.nz/assets/resources/driving-in-nz/docs/driving-in-nz.pdf"
  },
  {
    "id": "driving-013",
    "category": "driving",
    "scenario": "When rounding a right-hand bend on a two-way road, which action is appropriate?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Cut across the centre line for a smoother path"
      },
      {
        "id": "b",
        "label": "Stay on your side rather than cutting the corner"
      },
      {
        "id": "c",
        "label": "Drive on the opposing side if no headlights are visible"
      },
      {
        "id": "d",
        "label": "Sound the horn to reserve the middle"
      }
    ],
    "answerId": "b",
    "explanation": "Do not cut corners or move into the path of opposing traffic.",
    "rule": "NZ Road Code — Keeping left",
    "sourceUrl": "https://www.nzta.govt.nz/assets/resources/driving-in-nz/docs/driving-in-nz.pdf"
  },
  {
    "id": "driving-014",
    "category": "driving",
    "scenario": "You turn onto a two-way road from a car park. Where should you establish your position?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "On the right until the next intersection"
      },
      {
        "id": "b",
        "label": "In the centre until you gain speed"
      },
      {
        "id": "c",
        "label": "On the left-hand side"
      },
      {
        "id": "d",
        "label": "On whichever side your navigation screen shows"
      }
    ],
    "answerId": "c",
    "explanation": "Keep left whenever you pull onto a road.",
    "rule": "NZ Road Code — Keeping left",
    "sourceUrl": "https://www.nzta.govt.nz/assets/resources/driving-in-nz/docs/driving-in-nz.pdf"
  },
  {
    "id": "driving-015",
    "category": "driving",
    "scenario": "A compulsory sign directs traffic to keep left of an obstruction. What does it require?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Pass on the left of the obstruction"
      },
      {
        "id": "b",
        "label": "Pass on either side if clear"
      },
      {
        "id": "c",
        "label": "Stop beside the obstruction"
      },
      {
        "id": "d",
        "label": "Pass only on the right"
      }
    ],
    "answerId": "a",
    "explanation": "Compulsory signs specify actions that must or must not be taken.",
    "rule": "NZ Road Code — Signs and markings",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-signs/main-types-of-signs"
  },
  {
    "id": "driving-016",
    "category": "driving",
    "scenario": "You approach a STOP sign and can see no other traffic. What is required?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Slow down only"
      },
      {
        "id": "b",
        "label": "Stop only if another vehicle appears"
      },
      {
        "id": "c",
        "label": "Continue at walking pace"
      },
      {
        "id": "d",
        "label": "Stop completely, then give way as required"
      }
    ],
    "answerId": "d",
    "explanation": "A STOP sign requires a complete stop even when the road appears empty.",
    "rule": "NZ Road Code — Signs and markings",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-signs/main-types-of-signs"
  },
  {
    "id": "driving-017",
    "category": "driving",
    "scenario": "What is the correct response to a GIVE WAY sign?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Always maintain your speed"
      },
      {
        "id": "b",
        "label": "Slow down and give way, stopping if necessary"
      },
      {
        "id": "c",
        "label": "Stop for exactly three seconds"
      },
      {
        "id": "d",
        "label": "Give way only to trucks"
      }
    ],
    "answerId": "b",
    "explanation": "A GIVE WAY sign requires yielding; a stop is necessary when conditions demand it.",
    "rule": "NZ Road Code — Signs and markings",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-signs/main-types-of-signs"
  },
  {
    "id": "driving-018",
    "category": "driving",
    "scenario": "A red circular sign contains a white horizontal bar. What does it tell you?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Parking is available"
      },
      {
        "id": "b",
        "label": "The road is one lane wide"
      },
      {
        "id": "c",
        "label": "Do not enter this road from this direction"
      },
      {
        "id": "d",
        "label": "Proceed with headlights on"
      }
    ],
    "answerId": "c",
    "explanation": "The no-entry sign prohibits entering from that direction.",
    "rule": "NZ Road Code — Signs and markings",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-signs/main-types-of-signs"
  },
  {
    "id": "driving-019",
    "category": "driving",
    "scenario": "A standard T2 transit-lane sign is operating. How many occupants must an ordinary private car have to use that lane?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "At least two, including the driver"
      },
      {
        "id": "b",
        "label": "Two passengers plus the driver"
      },
      {
        "id": "c",
        "label": "Only the driver"
      },
      {
        "id": "d",
        "label": "At least four"
      }
    ],
    "answerId": "a",
    "explanation": "T2 means two or more people in the vehicle.",
    "rule": "NZ Road Code — Signs and markings",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-signs/main-types-of-signs"
  },
  {
    "id": "driving-020",
    "category": "driving",
    "scenario": "What does an orange diamond-shaped road sign generally indicate?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "A compulsory minimum speed"
      },
      {
        "id": "b",
        "label": "A permanent motorway exit"
      },
      {
        "id": "c",
        "label": "An unrestricted parking area"
      },
      {
        "id": "d",
        "label": "A temporary hazard or warning"
      }
    ],
    "answerId": "d",
    "explanation": "Temporary warning signs are orange.",
    "rule": "NZ Road Code — Signs and markings",
    "sourceUrl": "https://nzta.govt.nz/roadcode/code-for-cycling/road-signs-and-markings"
  },
  {
    "id": "driving-021",
    "category": "driving",
    "scenario": "A school patrol holds its STOP sign out across traffic. When may you proceed?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "As soon as your lane looks empty"
      },
      {
        "id": "b",
        "label": "After the sign has been withdrawn and it is safe"
      },
      {
        "id": "c",
        "label": "After waiting five seconds"
      },
      {
        "id": "d",
        "label": "When the vehicle behind moves"
      }
    ],
    "answerId": "b",
    "explanation": "Remain stopped until the school-patrol sign is withdrawn.",
    "rule": "NZ Road Code — Signs and markings",
    "sourceUrl": "https://nzta.govt.nz/roadcode/code-for-cycling/road-signs-and-markings"
  },
  {
    "id": "driving-022",
    "category": "driving",
    "scenario": "A yellow diamond-shaped sign warns of a slippery road. How should you interpret it?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "You must stop at the sign"
      },
      {
        "id": "b",
        "label": "It guarantees the road is dry beyond it"
      },
      {
        "id": "c",
        "label": "It warns of a hazard requiring extra care"
      },
      {
        "id": "d",
        "label": "It cancels the speed limit"
      }
    ],
    "answerId": "c",
    "explanation": "Warning signs alert drivers to hazards ahead.",
    "rule": "NZ Road Code — Signs and markings",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-signs/main-types-of-signs"
  },
  {
    "id": "driving-023",
    "category": "driving",
    "scenario": "Heavy rain makes the posted 100 km/h limit unsafe. What should determine your speed?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "A lower speed suitable for the conditions"
      },
      {
        "id": "b",
        "label": "The posted limit regardless of visibility"
      },
      {
        "id": "c",
        "label": "The speed of the fastest vehicle"
      },
      {
        "id": "d",
        "label": "Your usual journey time"
      }
    ],
    "answerId": "a",
    "explanation": "The limit is a maximum, not a target; speed must suit conditions.",
    "rule": "NZ Road Code — Speed and stopping distance",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-limits/speed-limits"
  },
  {
    "id": "driving-024",
    "category": "driving",
    "scenario": "You approach a sign reducing the limit from 80 to 50 km/h. When must your speed be no more than 50 km/h?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Within 100 metres after the sign"
      },
      {
        "id": "b",
        "label": "Only after the next intersection"
      },
      {
        "id": "c",
        "label": "After passing the first building"
      },
      {
        "id": "d",
        "label": "By the time you reach the sign"
      }
    ],
    "answerId": "d",
    "explanation": "A lower limit takes effect at its signpost.",
    "rule": "NZ Road Code — Speed and stopping distance",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-limits/speed-limits"
  },
  {
    "id": "driving-025",
    "category": "driving",
    "scenario": "The limit increases from 50 to 80 km/h ahead. When may you begin exceeding 50 km/h, if conditions allow?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "When you first see the sign"
      },
      {
        "id": "b",
        "label": "After you pass the 80 km/h sign"
      },
      {
        "id": "c",
        "label": "Halfway to the sign"
      },
      {
        "id": "d",
        "label": "Whenever the road becomes straight"
      }
    ],
    "answerId": "b",
    "explanation": "Do not increase to the new limit before passing its sign.",
    "rule": "NZ Road Code — Speed and stopping distance",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-limits/speed-limits"
  },
  {
    "id": "driving-026",
    "category": "driving",
    "scenario": "On a narrow road without a centre line or lanes, your speed must allow you to stop within what distance?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Twice the clear road visible"
      },
      {
        "id": "b",
        "label": "The whole clear road visible"
      },
      {
        "id": "c",
        "label": "Half the clear road visible ahead"
      },
      {
        "id": "d",
        "label": "A fixed 100 metres in every case"
      }
    ],
    "answerId": "c",
    "explanation": "Stopping within half the visible clear road allows for opposing traffic.",
    "rule": "NZ Road Code — Speed and stopping distance",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-limits/speed-limits"
  },
  {
    "id": "driving-027",
    "category": "driving",
    "scenario": "On a road with marked lanes, how much visible clear lane must be sufficient for stopping?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "The length of clear lane visible ahead"
      },
      {
        "id": "b",
        "label": "Twice that length"
      },
      {
        "id": "c",
        "label": "Only the distance to the next reflector"
      },
      {
        "id": "d",
        "label": "No stopping-distance requirement applies"
      }
    ],
    "answerId": "a",
    "explanation": "Drive so you can stop within the clear lane you can see.",
    "rule": "NZ Road Code — Speed and stopping distance",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-limits/speed-limits"
  },
  {
    "id": "driving-028",
    "category": "driving",
    "scenario": "Several vehicles collect behind you while you drive below the limit. What should you do?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Accelerate whenever passing becomes possible"
      },
      {
        "id": "b",
        "label": "Move towards the centre to discourage passing"
      },
      {
        "id": "c",
        "label": "Ignore them because you are below the limit"
      },
      {
        "id": "d",
        "label": "Keep left and pull over as soon as it is safe to let them pass"
      }
    ],
    "answerId": "d",
    "explanation": "Slower drivers must keep left and safely allow following vehicles to pass.",
    "rule": "NZ Road Code — Speed and stopping distance",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-limits/speed-limits"
  },
  {
    "id": "driving-029",
    "category": "driving",
    "scenario": "On an undivided road, you pass a school bus stopped to let children off. What is your maximum passing speed?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "40 km/h"
      },
      {
        "id": "b",
        "label": "20 km/h"
      },
      {
        "id": "c",
        "label": "30 km/h"
      },
      {
        "id": "d",
        "label": "The normal posted limit"
      }
    ],
    "answerId": "b",
    "explanation": "The 20 km/h requirement applies when passing a school bus loading or unloading children, from either direction.",
    "rule": "NZ Road Code — Speed and stopping distance",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-other-road-users/sharing-the-road/sharing-the-road-with-pedestrians/"
  },
  {
    "id": "driving-030",
    "category": "driving",
    "scenario": "You need to exceed the speed limit to complete an overtake. What is the lawful choice?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Exceed it briefly"
      },
      {
        "id": "b",
        "label": "Exceed it only while alongside"
      },
      {
        "id": "c",
        "label": "Do not undertake that overtake"
      },
      {
        "id": "d",
        "label": "Ask a passenger to watch for police"
      }
    ],
    "answerId": "c",
    "explanation": "Overtaking does not create an exemption from the speed limit.",
    "rule": "NZ Road Code — Speed and stopping distance",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-limits/speed-limits"
  },
  {
    "id": "driving-031",
    "category": "driving",
    "scenario": "In an ordinary private car, who must ensure a 12-year-old passenger uses the available seat belt?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "The driver"
      },
      {
        "id": "b",
        "label": "Only the child"
      },
      {
        "id": "c",
        "label": "Only the vehicle owner"
      },
      {
        "id": "d",
        "label": "Any adult except the driver"
      }
    ],
    "answerId": "a",
    "explanation": "The driver is responsible for correct restraint of passengers under 15.",
    "rule": "NZ Road Code — Seat belts and child restraints",
    "sourceUrl": "https://www.nzta.govt.nz/assets/resources/factsheets/30/docs/30-safety-belts.pdf"
  },
  {
    "id": "driving-032",
    "category": "driving",
    "scenario": "A six-year-old travels in your ordinary private car, with no applicable exemption. What is required?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "An adult seat belt alone"
      },
      {
        "id": "b",
        "label": "Sitting on an adult's lap"
      },
      {
        "id": "c",
        "label": "Sitting unrestrained in the rear"
      },
      {
        "id": "d",
        "label": "An approved child restraint used correctly"
      }
    ],
    "answerId": "d",
    "explanation": "Children under seven must use an approved child restraint, subject to specific legal exceptions.",
    "rule": "NZ Road Code — Seat belts and child restraints",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driver-responsibility/safety-belts-and-child-restraints/"
  },
  {
    "id": "driving-033",
    "category": "driving",
    "scenario": "An appropriate child restraint is available for a seven-year-old passenger. What must happen?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "The child may choose whether to use it"
      },
      {
        "id": "b",
        "label": "The child must use it"
      },
      {
        "id": "c",
        "label": "It is required only on motorways"
      },
      {
        "id": "d",
        "label": "The child must use an adult belt instead"
      }
    ],
    "answerId": "b",
    "explanation": "A seven-year-old must use an appropriate child restraint when one is available.",
    "rule": "NZ Road Code — Seat belts and child restraints",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driver-responsibility/safety-belts-and-child-restraints/"
  },
  {
    "id": "driving-034",
    "category": "driving",
    "scenario": "A rear-seat adult passenger has a seat belt available and no legal exemption. What applies on a short trip?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Belts are optional below 50 km/h"
      },
      {
        "id": "b",
        "label": "Only front-seat adults need belts"
      },
      {
        "id": "c",
        "label": "The passenger must wear the belt"
      },
      {
        "id": "d",
        "label": "The driver may waive the requirement"
      }
    ],
    "answerId": "c",
    "explanation": "A short journey does not remove the seat-belt requirement.",
    "rule": "NZ Road Code — Seat belts and child restraints",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driver-responsibility/safety-belts-and-child-restraints/"
  },
  {
    "id": "driving-035",
    "category": "driving",
    "scenario": "Which placement is correct for the lap section of a seat belt?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Low across the pelvis"
      },
      {
        "id": "b",
        "label": "Across the stomach"
      },
      {
        "id": "c",
        "label": "Under both thighs"
      },
      {
        "id": "d",
        "label": "Loose across the chest"
      }
    ],
    "answerId": "a",
    "explanation": "The lap belt should fit low across the pelvis, not the abdomen.",
    "rule": "NZ Road Code — Seat belts and child restraints",
    "sourceUrl": "https://www.nzta.govt.nz/assets/resources/factsheets/30/docs/30-safety-belts.pdf"
  },
  {
    "id": "driving-036",
    "category": "driving",
    "scenario": "You stop at a red light. May you pick up your phone to read a text?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Yes, because the car is stationary"
      },
      {
        "id": "b",
        "label": "Yes, if the text is short"
      },
      {
        "id": "c",
        "label": "Yes, if the handbrake is applied"
      },
      {
        "id": "d",
        "label": "No, the restriction also applies while stopped at an intersection"
      }
    ],
    "answerId": "d",
    "explanation": "Stopping in traffic or at an intersection does not permit reading texts.",
    "rule": "NZ Road Code — Mobile phones",
    "sourceUrl": "https://nzta.govt.nz/safety/driving-safely/driver-distraction/using-mobile-phones-while-driving/"
  },
  {
    "id": "driving-037",
    "category": "driving",
    "scenario": "Which arrangement can lawfully support phone navigation while driving?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Holding the phone below the window"
      },
      {
        "id": "b",
        "label": "A fixed mount that does not obstruct your view, with only infrequent brief touches"
      },
      {
        "id": "c",
        "label": "Resting the phone on your lap and repeatedly handling it"
      },
      {
        "id": "d",
        "label": "Having a passenger hold it while you operate it continuously"
      }
    ],
    "answerId": "b",
    "explanation": "Mounted navigation is permitted under the specified mounting and interaction conditions.",
    "rule": "NZ Road Code — Mobile phones",
    "sourceUrl": "https://nzta.govt.nz/safety/driving-safely/driver-distraction/using-mobile-phones-while-driving/"
  },
  {
    "id": "driving-038",
    "category": "driving",
    "scenario": "Your phone is securely mounted. Which activity remains prohibited while driving?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Using navigation within the permitted conditions"
      },
      {
        "id": "b",
        "label": "Making a permitted audio call"
      },
      {
        "id": "c",
        "label": "Reading a social-media feed"
      },
      {
        "id": "d",
        "label": "Using permitted audio functions"
      }
    ],
    "answerId": "c",
    "explanation": "Mounting does not authorise activities beyond the permitted audio, calling and navigation uses.",
    "rule": "NZ Road Code — Mobile phones",
    "sourceUrl": "https://nzta.govt.nz/safety/driving-safely/driver-distraction/using-mobile-phones-while-driving/"
  },
  {
    "id": "driving-039",
    "category": "driving",
    "scenario": "When can the specific emergency exception permit a hand-held 111 call while driving?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "When stopping to make the call is unsafe or impractical"
      },
      {
        "id": "b",
        "label": "Whenever the driver is late"
      },
      {
        "id": "c",
        "label": "Whenever mobile reception is weak"
      },
      {
        "id": "d",
        "label": "Whenever the call lasts under a minute"
      }
    ],
    "answerId": "a",
    "explanation": "The exception applies to a 111 call when stopping is unsafe or impractical.",
    "rule": "NZ Road Code — Mobile phones",
    "sourceUrl": "https://nzta.govt.nz/safety/driving-safely/driver-distraction/using-mobile-phones-while-driving/"
  },
  {
    "id": "driving-040",
    "category": "driving",
    "scenario": "A 19-year-old holds a full car licence. What alcohol limit applies?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "The ordinary adult limit"
      },
      {
        "id": "b",
        "label": "A higher limit because the licence is full"
      },
      {
        "id": "c",
        "label": "A limit based on body weight"
      },
      {
        "id": "d",
        "label": "Zero alcohol"
      }
    ],
    "answerId": "d",
    "explanation": "The zero-alcohol rule applies to drivers under 20 regardless of licence stage.",
    "rule": "NZ Road Code — Alcohol limits",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-limits/alcohol-and-drugs-limits/"
  },
  {
    "id": "driving-041",
    "category": "driving",
    "scenario": "For an ordinary driver aged 20 or over without a special alcohol condition, what is the breath-alcohol limit?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "150 micrograms per litre"
      },
      {
        "id": "b",
        "label": "250 micrograms per litre"
      },
      {
        "id": "c",
        "label": "400 micrograms per litre"
      },
      {
        "id": "d",
        "label": "500 micrograms per litre"
      }
    ],
    "answerId": "b",
    "explanation": "The ordinary limit is 250 micrograms of alcohol per litre of breath.",
    "rule": "NZ Road Code — Alcohol limits",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-limits/alcohol-and-drugs-limits/"
  },
  {
    "id": "driving-042",
    "category": "driving",
    "scenario": "For an ordinary driver aged 20 or over without a special alcohol condition, what is the blood-alcohol limit?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "20 milligrams per 100 millilitres"
      },
      {
        "id": "b",
        "label": "80 milligrams per 100 millilitres"
      },
      {
        "id": "c",
        "label": "50 milligrams per 100 millilitres"
      },
      {
        "id": "d",
        "label": "100 milligrams per 100 millilitres"
      }
    ],
    "answerId": "c",
    "explanation": "The ordinary limit is 50 milligrams of alcohol per 100 millilitres of blood.",
    "rule": "NZ Road Code — Alcohol limits",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-limits/alcohol-and-drugs-limits/"
  },
  {
    "id": "driving-043",
    "category": "driving",
    "scenario": "Which plan best avoids alcohol-related impairment when you will drive home?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Do not drink alcohol before driving"
      },
      {
        "id": "b",
        "label": "Assume two drinks are safe for everyone"
      },
      {
        "id": "c",
        "label": "Drink coffee immediately before driving"
      },
      {
        "id": "d",
        "label": "Rely on feeling normal"
      }
    ],
    "answerId": "a",
    "explanation": "Alcohol can affect reactions and senses; a legal threshold is not a guarantee of safe driving.",
    "rule": "NZ Road Code — Alcohol limits",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-limits/alcohol-and-drugs-limits/"
  },
  {
    "id": "driving-044",
    "category": "driving",
    "scenario": "Under the car-licensing rules in force in October 2026, what is the minimum age to apply for a learner licence?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "15"
      },
      {
        "id": "b",
        "label": "15½"
      },
      {
        "id": "c",
        "label": "17"
      },
      {
        "id": "d",
        "label": "16"
      }
    ],
    "answerId": "d",
    "explanation": "The minimum learner age is 16. Licensing requirements are changing in 2027; check NZTA for the current rules.",
    "rule": "NZ Road Code — Learner, restricted and full licences",
    "sourceUrl": "https://nzta.govt.nz/assets/resources/factsheets/45/docs/45-learning-to-drive.pdf"
  },
  {
    "id": "driving-045",
    "category": "driving",
    "scenario": "A learner car driver wants to practise on a public road. Which arrangement is required?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Any passenger in the rear seat"
      },
      {
        "id": "b",
        "label": "A qualified supervisor accompanying the driver"
      },
      {
        "id": "c",
        "label": "Telephone supervision from home"
      },
      {
        "id": "d",
        "label": "No supervisor on quiet roads"
      }
    ],
    "answerId": "b",
    "explanation": "A learner car driver must be accompanied by a supervisor whenever driving. Licensing requirements are changing in 2027; check NZTA for the current rules.",
    "rule": "NZ Road Code — Learner, restricted and full licences",
    "sourceUrl": "https://nzta.govt.nz/assets/resources/factsheets/45/docs/45-learning-to-drive.pdf"
  },
  {
    "id": "driving-046",
    "category": "driving",
    "scenario": "Where must L plates be displayed when a learner drives a car?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Only at the rear"
      },
      {
        "id": "b",
        "label": "Only inside the glovebox"
      },
      {
        "id": "c",
        "label": "At both the front and rear"
      },
      {
        "id": "d",
        "label": "Only on the passenger window"
      }
    ],
    "answerId": "c",
    "explanation": "Learner cars must display L plates at the front and rear. Licensing requirements are changing in 2027; check NZTA for the current rules.",
    "rule": "NZ Road Code — Learner, restricted and full licences",
    "sourceUrl": "https://nzta.govt.nz/assets/resources/factsheets/45/docs/45-learning-to-drive.pdf"
  },
  {
    "id": "driving-047",
    "category": "driving",
    "scenario": "May a learner car driver carry additional passengers while properly supervised?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Yes, if the supervisor agrees"
      },
      {
        "id": "b",
        "label": "No, under any circumstances"
      },
      {
        "id": "c",
        "label": "Only after six months"
      },
      {
        "id": "d",
        "label": "Only passengers aged over 25"
      }
    ],
    "answerId": "a",
    "explanation": "Learners may carry passengers with their supervisor's agreement. Licensing requirements are changing in 2027; check NZTA for the current rules.",
    "rule": "NZ Road Code — Learner, restricted and full licences",
    "sourceUrl": "https://nzta.govt.nz/assets/resources/factsheets/45/docs/45-learning-to-drive.pdf"
  },
  {
    "id": "driving-048",
    "category": "driving",
    "scenario": "Under the car-licensing rules in force in October 2026, what is the earliest ordinary age for a restricted car licence?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "16"
      },
      {
        "id": "b",
        "label": "17"
      },
      {
        "id": "c",
        "label": "18"
      },
      {
        "id": "d",
        "label": "16½"
      }
    ],
    "answerId": "d",
    "explanation": "Applicants must be at least 16½ and meet the other requirements. Licensing requirements are changing in 2027; check NZTA for the current rules.",
    "rule": "NZ Road Code — Learner, restricted and full licences",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-driver-licences/stage-2-restricted-licence"
  },
  {
    "id": "driving-049",
    "category": "driving",
    "scenario": "Under the car-licensing rules in force in October 2026, how long must you have held a current learner licence before applying for a restricted licence?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Three months"
      },
      {
        "id": "b",
        "label": "At least six months"
      },
      {
        "id": "c",
        "label": "Twelve months for everyone"
      },
      {
        "id": "d",
        "label": "No minimum period"
      }
    ],
    "answerId": "b",
    "explanation": "The existing minimum learner holding period is six months. Licensing requirements are changing in 2027; check NZTA for the current rules.",
    "rule": "NZ Road Code — Learner, restricted and full licences",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-driver-licences/stage-2-restricted-licence"
  },
  {
    "id": "driving-050",
    "category": "driving",
    "scenario": "Without an exemption, during which hours may a restricted car driver drive alone?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "6am to midnight"
      },
      {
        "id": "b",
        "label": "Any time"
      },
      {
        "id": "c",
        "label": "5am to 10pm"
      },
      {
        "id": "d",
        "label": "7am to 9pm"
      }
    ],
    "answerId": "c",
    "explanation": "Restricted drivers may drive alone between 5am and 10pm. Licensing requirements are changing in 2027; check NZTA for the current rules.",
    "rule": "NZ Road Code — Learner, restricted and full licences",
    "sourceUrl": "https://nzta.govt.nz/driver-licences/getting-a-licence/licences-by-vehicle-type/cars/restricted-licence/restricted-licence-conditions"
  },
  {
    "id": "driving-051",
    "category": "driving",
    "scenario": "A restricted driver must drive at 11pm and has no exemption. What is required?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "A supervisor in the front passenger seat"
      },
      {
        "id": "b",
        "label": "Any friend in the back seat"
      },
      {
        "id": "c",
        "label": "L plates instead of a supervisor"
      },
      {
        "id": "d",
        "label": "A text message from a parent"
      }
    ],
    "answerId": "a",
    "explanation": "Between 10pm and 5am a restricted driver needs a supervisor beside them. Licensing requirements are changing in 2027; check NZTA for the current rules.",
    "rule": "NZ Road Code — Learner, restricted and full licences",
    "sourceUrl": "https://nzta.govt.nz/driver-licences/getting-a-licence/licences-by-vehicle-type/cars/restricted-licence/restricted-licence-conditions"
  },
  {
    "id": "driving-052",
    "category": "driving",
    "scenario": "At noon, an unsupervised restricted driver wants to carry an unrelated friend who does not fall within any permitted passenger exception. Is this allowed?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Yes, if the friend has a learner licence"
      },
      {
        "id": "b",
        "label": "Yes, because it is daytime"
      },
      {
        "id": "c",
        "label": "Yes, on trips under 10 kilometres"
      },
      {
        "id": "d",
        "label": "No, a supervisor is needed for that passenger"
      }
    ],
    "answerId": "d",
    "explanation": "Daytime solo driving permission does not remove the restricted passenger conditions. Licensing requirements are changing in 2027; check NZTA for the current rules.",
    "rule": "NZ Road Code — Learner, restricted and full licences",
    "sourceUrl": "https://nzta.govt.nz/driver-licences/getting-a-licence/licences-by-vehicle-type/cars/restricted-licence/restricted-licence-conditions"
  },
  {
    "id": "driving-053",
    "category": "driving",
    "scenario": "Which passenger is expressly permitted with an unsupervised restricted driver during the permitted solo-driving hours?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Any work colleague"
      },
      {
        "id": "b",
        "label": "The driver's spouse or partner"
      },
      {
        "id": "c",
        "label": "Any neighbour"
      },
      {
        "id": "d",
        "label": "Any friend with a full licence who sits in the rear"
      }
    ],
    "answerId": "b",
    "explanation": "A spouse or partner is among the specified passenger exceptions. Licensing requirements are changing in 2027; check NZTA for the current rules.",
    "rule": "NZ Road Code — Learner, restricted and full licences",
    "sourceUrl": "https://nzta.govt.nz/driver-licences/getting-a-licence/licences-by-vehicle-type/cars/restricted-licence/restricted-licence-conditions"
  },
  {
    "id": "driving-054",
    "category": "driving",
    "scenario": "Under the car-licensing rules in force in October 2026, an applicant under 25 has not completed an approved advanced driving course. What minimum restricted holding period applies before a full licence?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Six months"
      },
      {
        "id": "b",
        "label": "Twelve months"
      },
      {
        "id": "c",
        "label": "Eighteen months"
      },
      {
        "id": "d",
        "label": "Twenty-four months"
      }
    ],
    "answerId": "c",
    "explanation": "Under-25 applicants without the approved course ordinarily need 18 months on restricted. Licensing requirements are changing in 2027; check NZTA for the current rules.",
    "rule": "NZ Road Code — Learner, restricted and full licences",
    "sourceUrl": "https://www.nzta.govt.nz/driver-licences/getting-a-licence/licences-by-vehicle-type/cars/full-licence-2/"
  },
  {
    "id": "driving-055",
    "category": "driving",
    "scenario": "Under the car-licensing rules in force in October 2026, an applicant aged 25 or over has not completed an approved advanced driving course. What minimum restricted holding period applies?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Six months"
      },
      {
        "id": "b",
        "label": "Three months"
      },
      {
        "id": "c",
        "label": "Twelve months"
      },
      {
        "id": "d",
        "label": "Eighteen months"
      }
    ],
    "answerId": "a",
    "explanation": "Applicants aged 25 or over ordinarily need six months, reduced to three with an approved course. Licensing requirements are changing in 2027; check NZTA for the current rules.",
    "rule": "NZ Road Code — Learner, restricted and full licences",
    "sourceUrl": "https://www.nzta.govt.nz/driver-licences/getting-a-licence/licences-by-vehicle-type/cars/full-licence-2/"
  },
  {
    "id": "driving-056",
    "category": "driving",
    "scenario": "Fog prevents you from clearly seeing a person or vehicle 100 metres away in daylight. What must you do?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Use park lights only"
      },
      {
        "id": "b",
        "label": "Wait until sunset to use headlights"
      },
      {
        "id": "c",
        "label": "Use the hazard lights instead of headlights"
      },
      {
        "id": "d",
        "label": "Turn on the headlights"
      }
    ],
    "answerId": "d",
    "explanation": "Headlights are required whenever visibility falls below the specified 100-metre standard.",
    "rule": "NZ Road Code — Lights and night driving",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driving/when-conditions-change/night-driving/"
  },
  {
    "id": "driving-057",
    "category": "driving",
    "scenario": "Which period has a general legal requirement to use headlights?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Only midnight to 5am"
      },
      {
        "id": "b",
        "label": "From 30 minutes after sunset until 30 minutes before sunrise"
      },
      {
        "id": "c",
        "label": "Only when there are no streetlights"
      },
      {
        "id": "d",
        "label": "From two hours after sunset until sunrise"
      }
    ],
    "answerId": "b",
    "explanation": "This is the prescribed night-time period; poor visibility can require headlights at other times too.",
    "rule": "NZ Road Code — Lights and night driving",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driving/when-conditions-change/night-driving/"
  },
  {
    "id": "driving-058",
    "category": "driving",
    "scenario": "You follow another vehicle at night. How should you use your headlights?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Keep high beam aimed at its mirrors"
      },
      {
        "id": "b",
        "label": "Switch all lights off"
      },
      {
        "id": "c",
        "label": "Use dipped headlights"
      },
      {
        "id": "d",
        "label": "Use park lights alone"
      }
    ],
    "answerId": "c",
    "explanation": "Headlights must be dipped when following other vehicles.",
    "rule": "NZ Road Code — Lights and night driving",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driving/when-conditions-change/night-driving/"
  },
  {
    "id": "driving-059",
    "category": "driving",
    "scenario": "An approaching vehicle could be dazzled by your high beam. What should you do?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Dip your headlights"
      },
      {
        "id": "b",
        "label": "Keep high beam until the other driver flashes"
      },
      {
        "id": "c",
        "label": "Turn on an interior light"
      },
      {
        "id": "d",
        "label": "Look directly at its headlights"
      }
    ],
    "answerId": "a",
    "explanation": "Dip headlights for approaching traffic to avoid dazzling the driver.",
    "rule": "NZ Road Code — Lights and night driving",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driving/when-conditions-change/night-driving/"
  },
  {
    "id": "driving-060",
    "category": "driving",
    "scenario": "A well-lit urban road makes it easy to see at night. May you drive using only park lights?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Yes, below 30 km/h"
      },
      {
        "id": "b",
        "label": "Yes, if other cars have headlights"
      },
      {
        "id": "c",
        "label": "Yes, in a town centre"
      },
      {
        "id": "d",
        "label": "No, park lights alone are not sufficient for driving"
      }
    ],
    "answerId": "d",
    "explanation": "The Road Code says never to drive with just park lights on.",
    "rule": "NZ Road Code — Lights and night driving",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driving/when-conditions-change/night-driving/"
  },
  {
    "id": "driving-061",
    "category": "driving",
    "scenario": "You plan to overtake on a two-way road. After completing the pass, how much clear road ahead must you still be able to see?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "25 metres"
      },
      {
        "id": "b",
        "label": "At least 100 metres"
      },
      {
        "id": "c",
        "label": "Only one vehicle length"
      },
      {
        "id": "d",
        "label": "No minimum visible distance"
      }
    ],
    "answerId": "b",
    "explanation": "Plan the pass so at least 100 metres of clear road remains visible throughout, including on completion.",
    "rule": "NZ Road Code — Overtaking",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-driving/key-driving-skills/passing"
  },
  {
    "id": "driving-062",
    "category": "driving",
    "scenario": "A solid yellow no-passing line is on your side of the centre line. May you cross it to overtake a moving car?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Yes, if the car is slow"
      },
      {
        "id": "b",
        "label": "Yes, if no police are visible"
      },
      {
        "id": "c",
        "label": "No"
      },
      {
        "id": "d",
        "label": "Yes, after sounding the horn"
      }
    ],
    "answerId": "c",
    "explanation": "Do not cross a yellow no-passing line on your side to overtake.",
    "rule": "NZ Road Code — Overtaking",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-driving/key-driving-skills/passing"
  },
  {
    "id": "driving-063",
    "category": "driving",
    "scenario": "A hill crest hides approaching traffic during a proposed overtake. What should you do?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Wait until you have sufficient clear visibility"
      },
      {
        "id": "b",
        "label": "Rely on the other driver's brake lights"
      },
      {
        "id": "c",
        "label": "Pass if your car accelerates quickly"
      },
      {
        "id": "d",
        "label": "Use the horn and proceed"
      }
    ],
    "answerId": "a",
    "explanation": "An overtake requires enough clear view to complete it safely.",
    "rule": "NZ Road Code — Overtaking",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-driving/key-driving-skills/passing"
  },
  {
    "id": "driving-064",
    "category": "driving",
    "scenario": "Another driver begins passing your slower vehicle on a straight section. How should you respond?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Accelerate to match them"
      },
      {
        "id": "b",
        "label": "Move right to reduce their space"
      },
      {
        "id": "c",
        "label": "Race them to the next bend"
      },
      {
        "id": "d",
        "label": "Do not speed up to prevent the pass"
      }
    ],
    "answerId": "d",
    "explanation": "Drivers must not accelerate to obstruct vehicles trying to pass.",
    "rule": "NZ Road Code — Overtaking",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-limits/speed-limits"
  },
  {
    "id": "driving-065",
    "category": "driving",
    "scenario": "You feel impatient behind a slower vehicle but cannot confirm the road ahead is clear. What is the appropriate decision?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Pass because impatience indicates delay"
      },
      {
        "id": "b",
        "label": "Remain behind until a safe opportunity exists"
      },
      {
        "id": "c",
        "label": "Follow extremely closely"
      },
      {
        "id": "d",
        "label": "Begin passing and decide later"
      }
    ],
    "answerId": "b",
    "explanation": "Impatience is not a reason to attempt a pass without adequate visibility.",
    "rule": "NZ Road Code — Overtaking",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-driving/key-driving-skills/passing"
  },
  {
    "id": "driving-066",
    "category": "driving",
    "scenario": "A cyclist is ahead on a narrow road with approaching traffic. There is not enough room to pass safely. What should you do?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Squeeze through immediately"
      },
      {
        "id": "b",
        "label": "Sound the horn continuously"
      },
      {
        "id": "c",
        "label": "Wait behind until there is a clear, safe passing space"
      },
      {
        "id": "d",
        "label": "Force the cyclist onto the verge"
      }
    ],
    "answerId": "c",
    "explanation": "Wait for a clear space before passing a cyclist on a narrow road.",
    "rule": "NZ Road Code — Vulnerable road users",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-other-road-users/sharing-the-road/sharing-the-road-with-cyclists/"
  },
  {
    "id": "driving-067",
    "category": "driving",
    "scenario": "What lateral passing space does the Road Code recommend allowing a cyclist if you can?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "At least 1.5 metres"
      },
      {
        "id": "b",
        "label": "Exactly 30 centimetres"
      },
      {
        "id": "c",
        "label": "No more than 50 centimetres"
      },
      {
        "id": "d",
        "label": "Only the width of a wing mirror"
      }
    ],
    "answerId": "a",
    "explanation": "The Road Code recommends at least 1.5 metres where possible; this question tests guidance, not a universal statutory minimum.",
    "rule": "NZ Road Code — Vulnerable road users",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-other-road-users/sharing-the-road/sharing-the-road-with-cyclists/"
  },
  {
    "id": "driving-068",
    "category": "driving",
    "scenario": "Before opening your parked car's traffic-side door, what should you do?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Open it quickly to warn cyclists"
      },
      {
        "id": "b",
        "label": "Assume cyclists will avoid it"
      },
      {
        "id": "c",
        "label": "Check only for trucks"
      },
      {
        "id": "d",
        "label": "Check carefully for approaching cyclists and other traffic"
      }
    ],
    "answerId": "d",
    "explanation": "Opening a door into a cyclist's path can cause serious injury.",
    "rule": "NZ Road Code — Vulnerable road users",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-other-road-users/sharing-the-road/sharing-the-road-with-cyclists/"
  },
  {
    "id": "driving-069",
    "category": "driving",
    "scenario": "You need to cross a cycle lane to enter a driveway. What must you do about cyclists using the lane?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Require them to give way to your indicator"
      },
      {
        "id": "b",
        "label": "Give way before crossing their path"
      },
      {
        "id": "c",
        "label": "Stop in the lane and wait"
      },
      {
        "id": "d",
        "label": "Sound the horn to clear the lane"
      }
    ],
    "answerId": "b",
    "explanation": "Drivers crossing a cycle lane must give way to cyclists.",
    "rule": "NZ Road Code — Vulnerable road users",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-other-road-users/sharing-the-road/sharing-the-road-with-cyclists/"
  },
  {
    "id": "driving-070",
    "category": "driving",
    "scenario": "A pedestrian is crossing on the far half of a zebra crossing with no raised central island. What must you do?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Proceed because they are not in your lane"
      },
      {
        "id": "b",
        "label": "Sound your horn and continue"
      },
      {
        "id": "c",
        "label": "Stop and give way"
      },
      {
        "id": "d",
        "label": "Pass behind another vehicle without checking"
      }
    ],
    "answerId": "c",
    "explanation": "Without a raised central island, give way to pedestrians on any part of the crossing.",
    "rule": "NZ Road Code — Vulnerable road users",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-other-road-users/sharing-the-road/sharing-the-road-with-pedestrians/"
  },
  {
    "id": "driving-071",
    "category": "driving",
    "scenario": "You follow a cyclist and intend to turn left at the intersection immediately ahead. What should you do?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Wait for the cyclist to pass the intersection before turning across their path"
      },
      {
        "id": "b",
        "label": "Overtake and turn sharply in front"
      },
      {
        "id": "c",
        "label": "Use the horn to make the cyclist stop"
      },
      {
        "id": "d",
        "label": "Move into the cycle lane beside them"
      }
    ],
    "answerId": "a",
    "explanation": "Do not cut across a cyclist's straight-through path when turning left.",
    "rule": "NZ Road Code — Vulnerable road users",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-other-road-users/sharing-the-road/sharing-the-road-with-cyclists/"
  },
  {
    "id": "driving-072",
    "category": "driving",
    "scenario": "Broken yellow lines run beside the kerb. What do they mean?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Parking is permitted for five minutes"
      },
      {
        "id": "b",
        "label": "Only overnight parking is banned"
      },
      {
        "id": "c",
        "label": "Stopping is allowed if you stay inside"
      },
      {
        "id": "d",
        "label": "You must not stop there"
      }
    ],
    "answerId": "d",
    "explanation": "Broken yellow edge lines are no-stopping lines.",
    "rule": "NZ Road Code — Parking",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driving/stopping-and-parking/where-not-to-park/"
  },
  {
    "id": "driving-073",
    "category": "driving",
    "scenario": "How close may you park to a vehicle entrance without breaching the minimum clearance rule?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Half a metre"
      },
      {
        "id": "b",
        "label": "At least one metre away"
      },
      {
        "id": "c",
        "label": "Directly across it if you leave a phone number"
      },
      {
        "id": "d",
        "label": "Any distance if the engine is running"
      }
    ],
    "answerId": "b",
    "explanation": "Do not park in front of or closer than one metre to a vehicle entrance.",
    "rule": "NZ Road Code — Parking",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driving/stopping-and-parking/where-not-to-park/"
  },
  {
    "id": "driving-074",
    "category": "driving",
    "scenario": "What is the minimum parking clearance on the approach side of a pedestrian crossing?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "One metre"
      },
      {
        "id": "b",
        "label": "Three metres"
      },
      {
        "id": "c",
        "label": "Six metres"
      },
      {
        "id": "d",
        "label": "Ten centimetres"
      }
    ],
    "answerId": "c",
    "explanation": "Do not park closer than six metres on the approach side.",
    "rule": "NZ Road Code — Parking",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driving/stopping-and-parking/where-not-to-park/"
  },
  {
    "id": "driving-075",
    "category": "driving",
    "scenario": "May you leave your car alongside another parked car while briefly collecting someone?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "No, that is prohibited double-parking"
      },
      {
        "id": "b",
        "label": "Yes, for up to two minutes"
      },
      {
        "id": "c",
        "label": "Yes, with hazard lights on"
      },
      {
        "id": "d",
        "label": "Yes, if one lane remains open"
      }
    ],
    "answerId": "a",
    "explanation": "Stopping or parking alongside another parked vehicle is double-parking.",
    "rule": "NZ Road Code — Parking",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driving/stopping-and-parking/where-not-to-park/"
  },
  {
    "id": "driving-076",
    "category": "driving",
    "scenario": "When may a car park on the right-hand side of the road under the general side-of-road rule?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Whenever the left side is full"
      },
      {
        "id": "b",
        "label": "Whenever it is after dark"
      },
      {
        "id": "c",
        "label": "On any quiet two-way street"
      },
      {
        "id": "d",
        "label": "On a one-way street, subject to other restrictions"
      }
    ],
    "answerId": "d",
    "explanation": "The general exception allowing right-side parking is a one-way street.",
    "rule": "NZ Road Code — Parking",
    "sourceUrl": "https://www.nzta.govt.nz/roadcode/general-road-code/about-driving/stopping-and-parking/where-not-to-park/"
  },
  {
    "id": "driving-077",
    "category": "driving",
    "scenario": "What must be displayed to use a mobility parking space?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "A note explaining your need"
      },
      {
        "id": "b",
        "label": "A valid mobility parking permit in the front window"
      },
      {
        "id": "c",
        "label": "A driver's licence"
      },
      {
        "id": "d",
        "label": "An ordinary parking receipt only"
      }
    ],
    "answerId": "b",
    "explanation": "A mobility parking permit must be displayed; need alone is insufficient.",
    "rule": "NZ Road Code — Parking",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-driving/stopping-and-parking/parking-signs"
  },
  {
    "id": "driving-078",
    "category": "driving",
    "scenario": "A car tows a normal light trailer on a road posted at 100 km/h. What is the maximum legal speed in otherwise suitable conditions?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "100 km/h"
      },
      {
        "id": "b",
        "label": "95 km/h"
      },
      {
        "id": "c",
        "label": "90 km/h"
      },
      {
        "id": "d",
        "label": "80 km/h"
      }
    ],
    "answerId": "c",
    "explanation": "A vehicle towing a trailer is generally limited to 90 km/h, or a lower applicable limit.",
    "rule": "NZ Road Code — Towing",
    "sourceUrl": "https://www.legislation.govt.nz/regulation/public/2004/0427/latest/DLM303086.html"
  },
  {
    "id": "driving-079",
    "category": "driving",
    "scenario": "Your car tows a trailer through a 60 km/h zone. What maximum applies?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "60 km/h"
      },
      {
        "id": "b",
        "label": "90 km/h because you are towing"
      },
      {
        "id": "c",
        "label": "80 km/h"
      },
      {
        "id": "d",
        "label": "100 km/h"
      }
    ],
    "answerId": "a",
    "explanation": "The towing ceiling does not override a lower posted speed limit.",
    "rule": "NZ Road Code — Towing",
    "sourceUrl": "https://www.legislation.govt.nz/regulation/public/2004/0427/latest/DLM303086.html"
  },
  {
    "id": "driving-080",
    "category": "driving",
    "scenario": "A car tows a disabled car using a non-rigid tow rope on a road with a higher posted limit. What statutory towing-speed ceiling applies?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "90 km/h"
      },
      {
        "id": "b",
        "label": "80 km/h"
      },
      {
        "id": "c",
        "label": "70 km/h"
      },
      {
        "id": "d",
        "label": "50 km/h"
      }
    ],
    "answerId": "d",
    "explanation": "Towing an ordinary motor vehicle using a non-rigid connection is limited to 50 km/h.",
    "rule": "NZ Road Code — Towing",
    "sourceUrl": "https://www.legislation.govt.nz/regulation/public/2004/0427/latest/DLM303086.html"
  },
  {
    "id": "driving-081",
    "category": "driving",
    "scenario": "Before moving off with a loaded trailer, you find items could fall from it. What must you do?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Drive slowly and hope they remain aboard"
      },
      {
        "id": "b",
        "label": "Secure the load before driving"
      },
      {
        "id": "c",
        "label": "Ask a passenger to watch it"
      },
      {
        "id": "d",
        "label": "Use hazard lights instead"
      }
    ],
    "answerId": "b",
    "explanation": "Do not drive with an unsafe load that is unsecured or could fall.",
    "rule": "NZ Road Code — Towing",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-driver-responsibility/responsible-driving"
  },
  {
    "id": "driving-082",
    "category": "driving",
    "scenario": "You pass your intended motorway exit. What is the correct response?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Reverse along the shoulder"
      },
      {
        "id": "b",
        "label": "Make a U-turn through a gap"
      },
      {
        "id": "c",
        "label": "Continue to the next exit"
      },
      {
        "id": "d",
        "label": "Stop in your lane to check the map"
      }
    ],
    "answerId": "c",
    "explanation": "Never reverse to a missed exit; continue to the next one.",
    "rule": "NZ Road Code — Motorways",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-driving/key-driving-skills/motorway-driving/"
  },
  {
    "id": "driving-083",
    "category": "driving",
    "scenario": "A friend asks you to collect them from the motorway shoulder. There is no emergency. What should you do?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Arrange collection somewhere off the motorway"
      },
      {
        "id": "b",
        "label": "Stop briefly with hazard lights"
      },
      {
        "id": "c",
        "label": "Stop if the shoulder is wide"
      },
      {
        "id": "d",
        "label": "Collect them from the exit gore"
      }
    ],
    "answerId": "a",
    "explanation": "You must not stop on a motorway to pick up or drop off passengers.",
    "rule": "NZ Road Code — Motorways",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-driving/key-driving-skills/motorway-driving/"
  },
  {
    "id": "driving-084",
    "category": "driving",
    "scenario": "Before changing lanes on a motorway, for how long must you signal?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Only while crossing the line"
      },
      {
        "id": "b",
        "label": "One second"
      },
      {
        "id": "c",
        "label": "No signal is needed in light traffic"
      },
      {
        "id": "d",
        "label": "At least three seconds"
      }
    ],
    "answerId": "d",
    "explanation": "Signal for at least three seconds before changing lanes.",
    "rule": "NZ Road Code — Motorways",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-driving/key-driving-skills/motorway-driving/"
  },
  {
    "id": "driving-085",
    "category": "driving",
    "scenario": "You have finished passing on a motorway and the left lane is clear. What should you do?",
    "imageAlt": "",
    "options": [
      {
        "id": "a",
        "label": "Stay right to discourage speeding"
      },
      {
        "id": "b",
        "label": "Return to the left when safe"
      },
      {
        "id": "c",
        "label": "Stop on the shoulder"
      },
      {
        "id": "d",
        "label": "Drive between the lanes"
      }
    ],
    "answerId": "b",
    "explanation": "Keep left on the motorway unless passing.",
    "rule": "NZ Road Code — Motorways",
    "sourceUrl": "https://nzta.govt.nz/roadcode/general-road-code/about-driving/key-driving-skills/motorway-driving/"
  }
];
