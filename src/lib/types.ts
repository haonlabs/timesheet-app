export interface Holiday {
  date: string; // YYYY-MM-DD
  type: 'public' | 'collective' | 'weekend' | 'manual';
  name: string;
}

export interface DayEntry {
  date: string; // YYYY-MM-DD
  workStart?: string; // HH:MM
  workEnd?: string;
  otStart?: string;
  otEnd?: string;
  totalHour?: string;
  totalOT?: string;
  activity: string;
  isHoliday?: boolean;
  holidayName?: string;
  holidayType?: Holiday['type'];
  workType?: 'WFH' | 'WFO' | '';
}

export interface TimesheetMeta {
  month: number; // 1-12
  year: number;
  employeeName: string;
  projectName: string;
  clientName: string;
  holidays: Holiday[];
  geminiApiKey?: string;
  logo?: string;         // base64
  signatures?: {
    employee?: string;   // base64
    supervisor1?: string; // base64
    supervisor2?: string; // base64
  };
  supervisorName?: string;
  supervisor2Name?: string;
  totalWorkDays?: number;
  totalAbsent?: number;
  totalSick?: number;
  totalLeave?: number;
}

export interface TimesheetState {
  meta: TimesheetMeta;
  entries: DayEntry[];
  templateParsed: boolean;
  templateBuffer?: ArrayBuffer;
}

export interface ParsedTemplate {
  companyName?: string;
  logoBase64?: string;
  headerFields: Record<string, string>;
}
