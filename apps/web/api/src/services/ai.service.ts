import OpenAI from 'openai';

// Initialize OpenAI client only if API key is available
const getOpenAIClient = () => {
  if (process.env.OPENAI_API_KEY) {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return null;
};

// ── HR Assistant Chat ─────────────────────────────────────────

const HR_SYSTEM_PROMPT = `You are NexusAI, a helpful and friendly AI HR Assistant for NexusHR platform.
You help employees with:
- Leave balances and applications
- Attendance queries  
- Payroll information
- Company policies
- HR processes
Keep responses concise, friendly, and professional.
Always respond in plain text (no markdown).`;

export const chatWithHRAssistant = async (
  message: string,
  context: Record<string, unknown>,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> => {
  const client = getOpenAIClient();
  
  if (!client) {
    return generateMockHRResponse(message, context);
  }

  try {
    const systemContext = `
User context:
- Name: ${context.name}
- Role: ${context.role}
- Department: ${context.department || 'N/A'}
- Leave Balance: Casual: ${context.casualLeave}, Sick: ${context.sickLeave}, Annual: ${context.annualLeave}
- Today's attendance: ${context.todayAttendance}
`;

    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: HR_SYSTEM_PROMPT + '\n' + systemContext },
        ...history.slice(-10),
        { role: 'user', content: message },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || 'I apologize, I could not process your request.';
  } catch (err) {
    console.error('[AI] Chat error:', err);
    return generateMockHRResponse(message, context);
  }
};

// ── Leave Recommendation ──────────────────────────────────────

export interface LeaveRecommendation {
  verdict: 'APPROVE' | 'REJECT' | 'REVIEW';
  score: number; // 0-100
  reason: string;
  details: {
    attendanceScore: number;
    leaveBalanceOk: boolean;
    hasConflicts: boolean;
    recentLeaves: number;
    workload: string;
  };
}

export const generateLeaveRecommendation = async (
  leaveData: {
    employeeName: string;
    leaveType: string;
    days: number;
    reason: string;
    startDate: string;
    endDate: string;
    attendanceRate: number;
    remainingBalance: number;
    recentLeaveCount: number;
    pendingTasksCount: number;
  }
): Promise<LeaveRecommendation> => {
  const client = getOpenAIClient();

  if (!client) {
    return generateMockLeaveRecommendation(leaveData);
  }

  try {
    const prompt = `You are an AI HR advisor. Analyze this leave request and respond with ONLY a valid JSON object.

Employee: ${leaveData.employeeName}
Leave Type: ${leaveData.leaveType}
Duration: ${leaveData.days} day(s) from ${leaveData.startDate} to ${leaveData.endDate}
Reason: ${leaveData.reason}
Attendance Rate (last 30 days): ${leaveData.attendanceRate}%
Remaining Leave Balance: ${leaveData.remainingBalance} days
Recent Leaves (last 60 days): ${leaveData.recentLeaveCount}

Respond with JSON: { "verdict": "APPROVE"|"REJECT"|"REVIEW", "score": 0-100, "reason": "concise reason", "details": { "attendanceScore": number, "leaveBalanceOk": boolean, "hasConflicts": boolean, "recentLeaves": number, "workload": "LOW"|"MEDIUM"|"HIGH" } }`;

    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content) as LeaveRecommendation;
    }
  } catch (err) {
    console.error('[AI] Leave recommendation error:', err);
  }

  return generateMockLeaveRecommendation(leaveData);
};

// ── Resume Screening ──────────────────────────────────────────

export interface ResumeScreeningResult {
  score: number; // 0-100
  summary: string;
  skills: string[];
  strengths: string[];
  weaknesses: string[];
  experienceYears: number;
  recommendation: string;
}

export const screenResume = async (
  resumeText: string,
  jobDescription: string,
  jobRequirements: string
): Promise<ResumeScreeningResult> => {
  const client = getOpenAIClient();

  if (!client || !resumeText) {
    return generateMockResumeScreening(resumeText);
  }

  try {
    const prompt = `You are an expert AI recruiter. Analyze this resume for the job and respond with ONLY valid JSON.

JOB: ${jobDescription}
REQUIREMENTS: ${jobRequirements}

RESUME (first 2000 chars):
${resumeText.slice(0, 2000)}

Respond with JSON: { "score": 0-100, "summary": "2-3 sentence assessment", "skills": ["skill1", ...], "strengths": ["str1", ...], "weaknesses": ["weak1", ...], "experienceYears": number, "recommendation": "concise hiring recommendation" }`;

    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content) as ResumeScreeningResult;
    }
  } catch (err) {
    console.error('[AI] Resume screening error:', err);
  }

  return generateMockResumeScreening(resumeText);
};

// ── Mock Responses ────────────────────────────────────────────

const generateMockHRResponse = (
  message: string,
  context: Record<string, unknown>
): string => {
  const msg = message.toLowerCase();

  if (msg.includes('leave') && (msg.includes('balance') || msg.includes('how many'))) {
    return `Hi ${context.name}! 👋 Here's your current leave balance:\n• Casual Leave: ${context.casualLeave} days\n• Sick Leave: ${context.sickLeave} days\n• Annual Leave: ${context.annualLeave} days\n\nWould you like to apply for a leave?`;
  }
  if (msg.includes('apply') && msg.includes('leave')) {
    return `Sure! To apply for leave, please go to the Leaves section and click "Apply Leave". You can also use the quick action button on your dashboard. 📝`;
  }
  if (msg.includes('attendance') || msg.includes('present')) {
    return `Your attendance this month is looking great! Today's status: ${context.todayAttendance}. You can view your full attendance calendar in the Attendance section. 📅`;
  }
  if (msg.includes('salary') || msg.includes('payroll') || msg.includes('pay')) {
    return `Salaries are credited on the last working day of each month. You can view your detailed payslip in the Payroll section. 💰`;
  }
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return `Hello ${context.name}! 👋 I'm NexusAI, your HR assistant. How can I help you today? I can answer questions about leaves, attendance, payroll, and company policies.`;
  }
  if (msg.includes('holiday') || msg.includes('holidays')) {
    return `Here are the upcoming company holidays:\n• Independence Day — Aug 15\n• Gandhi Jayanti — Oct 2\n• Diwali — Oct/Nov\n• Christmas — Dec 25\n\nCheck the HR announcements for the full calendar! 🗓️`;
  }
  if (msg.includes('policy') || msg.includes('policies')) {
    return `You can find all company policies in the HR Resources section. Key policies include:\n• Work from Home: Up to 3 days/week\n• Dress Code: Smart casual\n• Leave Notice: 48 hours advance notice required\n\nNeed details on a specific policy?`;
  }

  return `I understand you're asking about "${message}". I'm here to help with leaves, attendance, payroll, and HR policies. Could you be more specific about what you need? 😊`;
};

const generateMockLeaveRecommendation = (leaveData: {
  attendanceRate: number;
  remainingBalance: number;
  recentLeaveCount: number;
  days: number;
  leaveType: string;
}): LeaveRecommendation => {
  const score = Math.min(
    100,
    Math.round(
      (leaveData.attendanceRate * 0.4) +
      (leaveData.remainingBalance > 0 ? 40 : 0) +
      (leaveData.recentLeaveCount < 3 ? 20 : 0)
    )
  );

  const verdict: 'APPROVE' | 'REJECT' | 'REVIEW' =
    score >= 70 ? 'APPROVE' : score >= 40 ? 'REVIEW' : 'REJECT';

  return {
    verdict,
    score,
    reason:
      verdict === 'APPROVE'
        ? `Employee has good attendance (${leaveData.attendanceRate}%) and sufficient leave balance. Leave request is reasonable.`
        : verdict === 'REVIEW'
        ? `Attendance rate is moderate. Manager review recommended before approval.`
        : `Insufficient leave balance or low attendance rate. Consider rejecting or reducing duration.`,
    details: {
      attendanceScore: leaveData.attendanceRate,
      leaveBalanceOk: leaveData.remainingBalance >= leaveData.days,
      hasConflicts: false,
      recentLeaves: leaveData.recentLeaveCount,
      workload: 'MEDIUM',
    },
  };
};

const generateMockResumeScreening = (resumeText: string): ResumeScreeningResult => {
  const score = 60 + Math.floor(Math.random() * 35);
  const skills = resumeText
    ? ['JavaScript', 'React', 'Node.js', 'SQL', 'Git'].slice(0, 3 + Math.floor(Math.random() * 3))
    : ['JavaScript', 'React', 'Node.js'];

  return {
    score,
    summary: `The candidate demonstrates solid technical background with relevant experience in the required domain. Their profile shows a good match for the core requirements of the position.`,
    skills,
    strengths: ['Strong technical foundation', 'Relevant experience', 'Good communication skills'],
    weaknesses: ['Limited leadership experience', 'Could benefit from more project variety'],
    experienceYears: 2 + Math.floor(Math.random() * 6),
    recommendation:
      score >= 75
        ? 'Strong candidate. Recommend scheduling technical interview.'
        : score >= 55
        ? 'Moderate match. Consider for initial screening call.'
        : 'Below average match for role requirements.',
  };
};
