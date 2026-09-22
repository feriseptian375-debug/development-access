export type RatingValue = 'sangat_puas' | 'puas' | 'cukup' | 'tidak_puas';
export type RatingScore = 4 | 3 | 2 | 1;

export interface Service {
  id: string;
  name: string;
  description?: string;
  icon_name?: string;
  order_index: number;
  is_active: boolean;
  sub_services?: string[];
  created_at: string;
  updated_at: string;
}

export interface Survey {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  timestamp: number;
  service_id: string;
  service_name: string;
  sub_service_name?: string;
  rating: RatingValue;
  rating_score: RatingScore;
  feedback: string;
  feedback_choice: 'ada' | 'tidak_ada';
  status: 'valid' | 'archived';
  is_demo: boolean;
  created_at: string;
}

export interface ServiceOfficer {
  id: string; // e.g., 'srv-1:Meja Kasir' or 'srv-5'
  service_id: string;
  sub_service_name?: string;
  service_title: string;
  officer_name: string;
  officer_role?: string;
  photo_url: string;
}

export interface AppSettings {
  agency_name: string;
  app_name: string;
  logo_url: string;
  custom_kop_url?: string;
  survey_title: string;
  survey_subtitle: string;
  success_message: string;
  redirect_delay_seconds: number;
  primary_color: string;
  footer_text: string;
  service_officers?: ServiceOfficer[];
}

export interface AdminUser {
  id: string;
  username: string;
  full_name: string;
  role: 'superadmin' | 'admin';
}

export interface SurveyStats {
  total_respondents: number;
  today_respondents: number;
  average_score: number;
  satisfaction_rate: number; // percentage of puas + sangat puas
  ikm_score: number; // Indeks Kepuasan Masyarakat (0-100)
  ikm_grade: string; // Sangat Baik (A), Baik (B), Kurang Baik (C), Tidak Baik (D)
  distribution: {
    sangat_puas: number;
    puas: number;
    cukup: number;
    tidak_puas: number;
  };
  trend: Array<{
    date: string;
    formatted_date: string;
    total: number;
    sangat_puas: number;
    puas: number;
    cukup: number;
    tidak_puas: number;
    avg_score: number;
  }>;
  service_breakdown: Array<{
    service_id: string;
    service_name: string;
    total: number;
    sangat_puas: number;
    puas: number;
    cukup: number;
    tidak_puas: number;
    avg_score: number;
    satisfaction_rate: number;
  }>;
}

export interface SurveyFilterParams {
  search?: string;
  start_date?: string;
  end_date?: string;
  service_id?: string;
  rating?: string;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'rating_score' | 'service_name';
  sort_order?: 'asc' | 'desc';
}

export interface ReportData {
  period_label: string;
  start_date: string;
  end_date: string;
  service_name: string;
  generated_at: string;
  total_respondents: number;
  counts: {
    sangat_puas: number;
    puas: number;
    cukup: number;
    tidak_puas: number;
  };
  percentages: {
    sangat_puas: number;
    puas: number;
    cukup: number;
    tidak_puas: number;
  };
  average_score: number;
  ikm_score: number;
  ikm_grade: string;
  service_breakdown: Array<{
    service_name: string;
    total: number;
    percentages: {
      sangat_puas: number;
      puas: number;
      cukup: number;
      tidak_puas: number;
    };
    avg_score: number;
  }>;
}
