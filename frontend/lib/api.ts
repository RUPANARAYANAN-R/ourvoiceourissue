/**
 * NammaKural API client — communicates with FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('nk_token', token);
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('nk_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nk_token');
      localStorage.removeItem('nk_user');
    }
  }

  private async request(endpoint: string, options: RequestOptions = {}) {
    const { method = 'GET', body, headers = {}, isFormData = false } = options;
    
    const reqHeaders: Record<string, string> = { ...headers };
    const token = this.getToken();
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }
    if (!isFormData && body) {
      reqHeaders['Content-Type'] = 'application/json';
    }

    const config: RequestInit = {
      method,
      headers: reqHeaders,
    };
    
    if (body) {
      config.body = isFormData ? body : JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${endpoint}`, config);
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || `API error: ${res.status}`);
    }
    
    return res.json();
  }

  // ─── Auth ────────────────────────────────────────
  async login(username: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    this.setToken(data.access_token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nk_user', JSON.stringify(data.user));
    }
    return data;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // ─── Voice ───────────────────────────────────────
  async transcribeAudio(audioBlob: Blob, fallbackText?: string, language?: string) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    if (fallbackText) {
      formData.append('text', fallbackText);
    }
    if (language) {
      formData.append('language', language);
    }
    return this.request('/voice/transcribe', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  }

  async analyzeVoice(audioBlob?: Blob, text?: string, language?: string) {
    const formData = new FormData();
    if (audioBlob) {
      formData.append('audio', audioBlob, 'recording.webm');
    }
    if (text) {
      formData.append('text', text);
    }
    if (language) {
      formData.append('language', language);
    }
    return this.request('/voice/analyze', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  }

  async analyzeText(text: string, language?: string) {
    const formData = new FormData();
    formData.append('text', text);
    if (language) {
      formData.append('language', language);
    }
    return this.request('/voice/analyze', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  }

  async analyzeImage(imageFile: Blob, language?: string, lat?: number, lng?: number) {
    const formData = new FormData();
    formData.append('image', imageFile, 'photo.jpg');
    if (language) {
      formData.append('language', language);
    }
    if (lat !== undefined) {
      formData.append('latitude', String(lat));
    }
    if (lng !== undefined) {
      formData.append('longitude', String(lng));
    }
    return this.request('/voice/analyze-image', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  }

  // ─── Grievances ──────────────────────────────────
  async createGrievance(data: any) {
    return this.request('/grievances', { method: 'POST', body: data });
  }

  async listGrievances(params: Record<string, any> = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
    ).toString();
    return this.request(`/grievances?${query}`);
  }

  async getGrievance(id: string) {
    return this.request(`/grievances/${id}`);
  }

  async updateGrievance(id: string, data: any) {
    return this.request(`/grievances/${id}`, { method: 'PATCH', body: data });
  }

  async submitClarification(id: string, answers: any[]) {
    return this.request(`/grievances/${id}/clarification`, { method: 'POST', body: answers });
  }

  async validateGrievance(id: string) {
    return this.request(`/grievances/${id}/validate`, { method: 'POST' });
  }

  async uploadEvidence(id: string, file: File, type: string = 'PHOTO', lat?: number, lng?: number) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('evidence_type', type);
    if (lat !== undefined) formData.append('latitude', lat.toString());
    if (lng !== undefined) formData.append('longitude', lng.toString());
    return this.request(`/grievances/${id}/evidence`, {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  }

  async getDashboardStats() {
    return this.request('/grievances/stats');
  }

  // ─── Workflow ────────────────────────────────────
  async acknowledgeGrievance(id: string) {
    return this.request(`/grievances/${id}/acknowledge`, { method: 'POST' });
  }

  async startProgress(id: string) {
    return this.request(`/grievances/${id}/start`, { method: 'POST' });
  }

  async resolveGrievance(id: string, notes: string) {
    return this.request(`/grievances/${id}/resolve`, {
      method: 'POST',
      body: { resolution_notes: notes },
    });
  }

  async confirmResolution(id: string, confirmed: boolean, feedback?: string) {
    return this.request(`/grievances/${id}/confirm`, {
      method: 'POST',
      body: { confirmed, feedback },
    });
  }

  // ─── Intelligence ───────────────────────────────
  async getSimilar(id: string) {
    return this.request(`/intelligence/similar/${id}`);
  }

  async getClusters(params: Record<string, any> = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
    ).toString();
    return this.request(`/intelligence/clusters?${query}`);
  }

  async getEmergingIssues() {
    return this.request('/intelligence/emerging-issues');
  }

  async getHeatmap(category?: string) {
    const query = category ? `?category=${category}` : '';
    return this.request(`/intelligence/heatmap${query}`);
  }

  async getSlaRisks() {
    return this.request('/intelligence/sla-risks');
  }

  // ─── Schemes ─────────────────────────────────────
  async listSchemes(category?: string) {
    const query = category ? `?category=${category}` : '';
    return this.request(`/schemes${query}`);
  }

  async matchSchemes(text?: string, category?: string) {
    return this.request('/schemes/match', {
      method: 'POST',
      body: { text, category },
    });
  }

  async assessScheme(schemeId: string, citizenInput: Record<string, any>) {
    return this.request(`/schemes/${schemeId}/assess`, {
      method: 'POST',
      body: citizenInput,
    });
  }
}

export const api = new ApiClient();
export default api;
