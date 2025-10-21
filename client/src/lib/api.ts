const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export class ApiClient {
  private baseURL: string;

  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Users
  async getUsers() {
    return this.request('/users');
  }

  async createUser(userData: any) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Artists
  async getArtists() {
    return this.request('/artists');
  }

  async createArtist(artistData: any) {
    return this.request('/artists', {
      method: 'POST',
      body: JSON.stringify(artistData),
    });
  }

  // Personas
  async getPersonas() {
    return this.request('/personas');
  }

  async createPersona(personaData: any) {
    return this.request('/personas', {
      method: 'POST',
      body: JSON.stringify(personaData),
    });
  }

  // Content
  async getContent() {
    return this.request('/content');
  }

  async createContent(contentData: any) {
    return this.request('/content', {
      method: 'POST',
      body: JSON.stringify(contentData),
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

export const apiClient = new ApiClient();