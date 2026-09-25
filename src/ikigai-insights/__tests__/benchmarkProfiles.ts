import type { FieldId, FieldReflections, Reflection } from "../../ikigai-alpha/types";

type ReflectionInput = [label: string, notes?: string];

export interface BenchmarkProfile {
  id: string;
  name: string;
  reflections: FieldReflections;
  expectedThemes: string[];
  expectedRoles?: string[];
}

function buildReflections(id: string, fields: Partial<Record<FieldId, ReflectionInput[]>>): FieldReflections {
  const result: FieldReflections = { love: [], ability: [], meaning: [], paid: [] };
  (Object.entries(fields) as Array<[FieldId, ReflectionInput[]]>).forEach(([fieldId, items]) => {
    result[fieldId] = items.map(([label, notes], index): Reflection => ({
      id: `${id}-${fieldId}-${index}`,
      fieldId,
      label,
      notes,
      createdAt: index + 1,
      positionSeed: ((index + 1) * 0.217) % 1,
    }));
  });
  return result;
}

function profile(
  id: string,
  name: string,
  fields: Partial<Record<FieldId, ReflectionInput[]>>,
  expectedThemes: string[],
  expectedRoles?: string[],
): BenchmarkProfile {
  return { id, name, reflections: buildReflections(id, fields), expectedThemes, expectedRoles };
}

export const benchmarkProfiles: BenchmarkProfile[] = [
  profile("product-builder", "Digital product builder", {
    love: [["Prototyping useful tools", "I enjoy shaping messy ideas into simple product experiences."]],
    ability: [["Shipping clear interfaces", "Teams ask me to design, prioritize, and execute."]],
    meaning: [["Making technology accessible", "I care about lowering barriers for everyday users."]],
    paid: [["Building digital products", "Companies pay for product judgment and reliable execution."]],
  }, ["building", "designing", "access"], ["Builder"]),
  profile("teacher-guide", "Teacher and mentor", {
    love: [["Teaching through stories", "I lose track of time helping learners understand."]],
    ability: [["Explaining difficult ideas", "Students ask me to make complicated topics clear."]],
    meaning: [["Helping young people gain confidence"]],
    paid: [["Coaching and workshops", "Schools value training and mentoring."]],
  }, ["teaching", "clarity", "confidence"], ["Guide", "Translator"]),
  profile("strategy-analyst", "Strategy analyst", {
    love: [["Researching hidden patterns"]],
    ability: [["Synthesizing messy data", "Leaders ask me for judgment and recommendations."]],
    meaning: [["Helping teams make better decisions"]],
    paid: [["Strategy and prioritization", "Clients pay for analysis and roadmaps."]],
  }, ["analysis", "strategy", "better-decisions"], ["Strategist", "Investigator"]),
  profile("community-connector", "Community organizer", {
    love: [["Hosting gatherings", "I enjoy bringing interesting people together."]],
    ability: [["Building trust quickly"]],
    meaning: [["Creating belonging in local communities"]],
    paid: [["Community partnerships", "Organizations value relationship building."]],
  }, ["connecting", "community", "belonging"], ["Connector"]),
  profile("healthcare-caregiver", "Health-care caregiver", {
    love: [["Listening when people feel afraid"]],
    ability: [["Calming and supporting families"]],
    meaning: [["Helping people heal with dignity"]],
    paid: [["Patient care and guidance"]],
  }, ["caring", "empathy", "wellbeing"], ["Guide", "Steward"]),
  profile("climate-advocate", "Climate advocate", {
    love: [["Restoring natural places", "I feel alive outside protecting ecosystems."]],
    ability: [["Mobilizing people around climate action"]],
    meaning: [["A healthier planet for future generations"]],
    paid: [["Sustainability programs and advocacy"]],
  }, ["nature-environment", "advocacy", "positive-change"], ["Steward"]),
  profile("operations-lead", "Operations lead", {
    love: [["Turning confusion into order"]],
    ability: [["Designing reliable processes"]],
    meaning: [["Making teams less overwhelmed"]],
    paid: [["Running complex operations", "Organizations pay me to execute consistently."]],
  }, ["organizing", "operating", "efficiency"], ["Organizer"]),
  profile("investigative-journalist", "Investigative journalist", {
    love: [["Following unanswered questions"]],
    ability: [["Researching and interviewing deeply"]],
    meaning: [["Helping the public understand hidden systems"]],
    paid: [["Reporting and narrative writing"]],
  }, ["researching", "storytelling", "understanding"], ["Investigator", "Storyteller"]),
  profile("ux-researcher", "UX researcher", {
    love: [["Understanding why users struggle"]],
    ability: [["Listening and finding behavioral patterns"]],
    meaning: [["Designing more humane experiences"]],
    paid: [["User research and product insight"]],
  }, ["researching", "empathy", "designing"], ["Investigator"]),
  profile("career-coach", "Career coach", {
    love: [["Helping people see new possibilities"]],
    ability: [["Asking clarifying questions"]],
    meaning: [["Giving professionals confidence and direction"]],
    paid: [["Career coaching and workshops"]],
  }, ["mentoring", "guidance", "confidence"], ["Guide"]),
  profile("facilitator", "Workshop facilitator", {
    love: [["Creating conversations where everyone contributes"]],
    ability: [["Facilitating difficult group decisions"]],
    meaning: [["Helping teams find shared direction"]],
    paid: [["Leading strategy workshops"]],
  }, ["facilitation", "collaboration", "better-decisions"], ["Facilitator", "Strategist"]),
  profile("financial-planner", "Financial planner", {
    love: [["Making money decisions less frightening"]],
    ability: [["Explaining financial tradeoffs clearly"]],
    meaning: [["Helping families feel secure"]],
    paid: [["Financial planning and advice"]],
  }, ["security", "explaining", "better-decisions"], ["Translator", "Strategist"]),
  profile("visual-artist", "Visual artist", {
    love: [["Making images that express emotion"]],
    ability: [["Composition, color, and visual craft"]],
    meaning: [["Helping people feel seen through art"]],
    paid: [["Illustration and creative commissions"]],
  }, ["expression", "beauty", "creating"], ["Storyteller"]),
  profile("startup-founder", "Startup founder", {
    love: [["Turning an idea into something real"]],
    ability: [["Finding opportunities and building teams"]],
    meaning: [["Solving painful customer problems"]],
    paid: [["Creating products people buy"]],
  }, ["building", "entrepreneurial", "problem-solving"], ["Builder"]),
  profile("technical-writer", "Technical writer", {
    love: [["Making complicated systems understandable"]],
    ability: [["Writing precise explanations"]],
    meaning: [["Giving users clarity and confidence"]],
    paid: [["Documentation and technical communication"]],
  }, ["explaining", "clarity", "communicating"], ["Translator"]),
  profile("project-manager", "Project manager", {
    love: [["Helping a plan come together"]],
    ability: [["Coordinating details across teams"]],
    meaning: [["Making collaboration calmer"]],
    paid: [["Delivering structured projects"]],
  }, ["organizing", "collaboration", "execution"], ["Organizer"]),
  profile("mediator", "Mediator", {
    love: [["Helping people hear each other"]],
    ability: [["Mediating tense conversations"]],
    meaning: [["Building trust across differences"]],
    paid: [["Conflict facilitation and negotiation"]],
  }, ["facilitation", "empathy", "relationship-building"], ["Facilitator", "Connector"]),
  profile("data-visualizer", "Data visualization specialist", {
    love: [["Finding the story inside data"]],
    ability: [["Turning analysis into clear visuals"]],
    meaning: [["Helping people understand evidence"]],
    paid: [["Dashboards and analytical storytelling"]],
  }, ["analysis", "designing", "clarity"], ["Translator", "Investigator"]),
  profile("nonprofit-operator", "Nonprofit program operator", {
    love: [["Making community programs work"]],
    ability: [["Coordinating partners and logistics"]],
    meaning: [["Expanding access for underserved families"]],
    paid: [["Managing social-impact programs"]],
  }, ["operating", "access", "underserved"], ["Organizer", "Steward"]),
  profile("chef-host", "Chef and host", {
    love: [["Cooking meals for a full table"]],
    ability: [["Balancing flavor, timing, and hospitality"]],
    meaning: [["Helping people connect over food"]],
    paid: [["Creating memorable dining experiences"]],
  }, ["food-hospitality", "connection", "craftsmanship"], ["Connector"]),
  profile("musician", "Musician and performer", {
    love: [["Playing piano until I lose track of time"]],
    ability: [["Writing music and performing live"]],
    meaning: [["Helping audiences feel less alone"]],
    paid: [["Concerts, composition, and recording"]],
  }, ["artistic-performance", "expression", "connection"], ["Storyteller"]),
  profile("fitness-coach", "Fitness coach", {
    love: [["Moving and training outdoors"]],
    ability: [["Designing practical workouts"]],
    meaning: [["Helping people feel strong and healthy"]],
    paid: [["Fitness coaching and group classes"]],
  }, ["movement-health", "wellbeing", "guidance"], ["Guide"]),
  profile("public-interest-lawyer", "Public-interest lawyer", {
    love: [["Building a persuasive case"]],
    ability: [["Writing arguments and negotiating"]],
    meaning: [["Protecting fairness and access"]],
    paid: [["Legal advocacy and counsel"]],
  }, ["advocacy", "fairness", "persuading"], ["Strategist"]),
  profile("recruiter", "Talent recruiter", {
    love: [["Discovering what makes someone distinctive"]],
    ability: [["Building relationships with candidates"]],
    meaning: [["Connecting people with opportunity"]],
    paid: [["Hiring strategy and recruiting"]],
  }, ["relationship-building", "opportunity", "connecting"], ["Connector"]),
  profile("people-developer", "People development leader", {
    love: [["Helping teammates grow"]],
    ability: [["Coaching through difficult transitions"]],
    meaning: [["Creating healthy and inclusive teams"]],
    paid: [["Leadership development programs"]],
  }, ["growth", "mentoring", "teams"], ["Guide"]),
  profile("novelist", "Novelist", {
    love: [["Writing characters and imagined worlds"]],
    ability: [["Shaping emotional narratives"]],
    meaning: [["Giving readers language for difficult feelings"]],
    paid: [["Books, essays, and editorial work"]],
  }, ["storytelling", "expression", "communicating"], ["Storyteller"]),
  profile("scientist", "Research scientist", {
    love: [["Investigating unanswered questions"]],
    ability: [["Designing careful experiments"]],
    meaning: [["Creating reliable knowledge"]],
    paid: [["Research, analysis, and scientific advice"]],
  }, ["researching", "curiosity", "analysis"], ["Investigator"]),
  profile("furniture-restorer", "Furniture restorer", {
    love: [["Restoring old furniture by hand"]],
    ability: [["Patient woodworking and precise repair"]],
    meaning: [["Preserving useful objects instead of discarding them"]],
    paid: [["Custom restoration and repair"]],
  }, ["craftsmanship", "hands-on", "mastery"], ["Builder"]),
  profile("sales-leader", "Consultative sales leader", {
    love: [["Understanding what a customer actually needs"]],
    ability: [["Presenting and persuading with empathy"]],
    meaning: [["Connecting teams with useful solutions"]],
    paid: [["Sales strategy and partnerships"]],
  }, ["persuading", "empathy", "strategy"], ["Strategist", "Connector"]),
  profile("parent-caregiver", "Parent and family caregiver", {
    love: [["Creating calm family rituals"]],
    ability: [["Organizing many needs with patience"]],
    meaning: [["Helping children feel safe and loved"]],
    paid: [["Reliable care and household planning"]],
  }, ["caring", "families", "organizing"], ["Steward"]),
  profile("travel-explorer", "Travel explorer", {
    love: [["Discovering unfamiliar places"]],
    ability: [["Adapting when plans change"]],
    meaning: [["Helping others approach cultures with curiosity"]],
    paid: [["Travel research and storytelling"]],
  }, ["exploring", "adaptability", "adventure"], ["Investigator", "Storyteller"]),
  profile("sustainability-operator", "Sustainability operator", {
    love: [["Finding practical ways to reduce waste"]],
    ability: [["Building efficient environmental systems"]],
    meaning: [["Protecting nature through measurable change"]],
    paid: [["Running corporate sustainability programs"]],
  }, ["nature-environment", "efficiency", "operating"], ["Organizer", "Steward"]),
  profile("therapist", "Therapist", {
    love: [["Listening beneath what people first say"]],
    ability: [["Helping people understand emotional patterns"]],
    meaning: [["Supporting healing and wellbeing"]],
    paid: [["Therapy and mental-health care"]],
  }, ["empathy", "understanding", "wellbeing"], ["Guide"]),
  profile("museum-curator", "Museum curator", {
    love: [["Finding connections between objects and history"]],
    ability: [["Researching and shaping exhibitions"]],
    meaning: [["Making culture accessible to communities"]],
    paid: [["Curation, interpretation, and public programs"]],
  }, ["researching", "storytelling", "access"], ["Investigator", "Storyteller"]),
  profile("chinese-product", "Bilingual product leader", {
    love: [["我喜欢创造有用的产品"]],
    ability: [["把复杂问题讲清楚", "擅长分析和整合"]],
    meaning: [["帮助用户获得更好的体验"]],
    paid: [["产品战略和团队领导"]],
  }, ["creating", "clarity", "strategy"], ["Builder", "Translator", "Strategist"]),
  profile("chinese-educator", "Bilingual educator", {
    love: [["我喜欢教学和讲故事"]],
    ability: [["辅导学生建立自信"]],
    meaning: [["让资源不足的年轻人获得机会"]],
    paid: [["教育项目和教师培训"]],
  }, ["teaching", "confidence", "opportunity"], ["Guide"]),
];
