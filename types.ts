
export interface CurriculumItem {
  code: string;
  content: string;
}

export interface Segment {
  title: string;
  time: string;
  points: string[];
}

export interface DeepDiveItem {
  term: string;
  explanation: string;
}

export interface QAItem {
  question: string;
  answer: string;
}

export interface LessonPlan {
  theme: {
    title: string;
    source: string;
  };
  curriculum: {
    domain: string;
    grade: string;
    items: CurriculumItem[];
  };
  segments: Segment[];
  deepDive: DeepDiveItem[];
  qa: QAItem[];
}

export type InputType = 'movie' | 'youtube';
export type AcademicLevel = '高中' | '技高';
