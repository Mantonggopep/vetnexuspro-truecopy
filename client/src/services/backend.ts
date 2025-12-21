// No more mock data imports - all data comes from database

export interface Document {
    id: string;
    [key: string]: any;
}

// Ensure this matches your Vite proxy or Server URL
const API_URL = '/api';

interface IBackend {
    // Generic Data Methods
    getCollection(collectionName: string): Promise<Document[]>;
    find(collectionName: string, query: Record<string, any>): Promise<Document[]>;
    findById(collectionName: string, id: string): Promise<Document | undefined>;
    insert(collectionName: string, data: Document): Promise<Document>;
    update(collectionName: string, id: string, data: Partial<Document>): Promise<Document | null>;
    remove(collectionName: string, id: string): Promise<boolean>;

    // Auth & System Methods
    getFullState(): Promise<any>;
    registerTenant(data: any): Promise<any>;
    login(email: string, pass: string): Promise<any>;
    forgotPassword(email: string): Promise<void>;
    verifyPayment(txId: string, planConfig: any): Promise<boolean>;
}

const getToken = () => {
    return localStorage.getItem('vet_token');
};

const getHeaders = () => {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

// --- Offline Queue Logic ---
interface QueuedRequest {
    id: string;
    method: 'POST' | 'PUT' | 'DELETE';
    url: string;
    body?: any;
    timestamp: number;
}

const QUEUE_KEY = 'vet_nexus_offline_queue';

class RequestQueue {
    private queue: QueuedRequest[] = [];
    private isProcessing = false;

    constructor() {
        this.load();
        window.addEventListener('online', () => this.process());
    }

    private load() {
        const stored = localStorage.getItem(QUEUE_KEY);
        if (stored) {
            try {
                this.queue = JSON.parse(stored);
            } catch (e) {
                this.queue = [];
            }
        }
    }

    private save() {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    }

    enqueue(method: 'POST' | 'PUT' | 'DELETE', url: string, body?: any) {
        this.queue.push({
            id: Math.random().toString(36).substr(2, 9),
            method,
            url,
            body,
            timestamp: Date.now()
        });
        this.save();
        if (navigator.onLine) this.process();
    }

    async process() {
        if (this.isProcessing || this.queue.length === 0 || !navigator.onLine) return;

        this.isProcessing = true;
        const currentQueue = [...this.queue];

        console.log(`Processing ${currentQueue.length} offline requests...`);

        for (const req of currentQueue) {
            try {
                const res = await fetch(req.url, {
                    method: req.method,
                    headers: getHeaders(),
                    body: req.body ? JSON.stringify(req.body) : undefined
                });

                if (res.ok || res.status === 409) {
                    this.queue = this.queue.filter(q => q.id !== req.id);
                    this.save();
                } else if (res.status >= 500) {
                    break; // Stop on server error
                } else {
                    // 4xx errors (except 409) usually mean the request is bad and shouldn't be retried
                    console.error(`Request ${req.id} failed: ${res.status}`);
                    this.queue = this.queue.filter(q => q.id !== req.id);
                    this.save();
                }
            } catch (e) {
                break; // Stop on network error
            }
        }

        this.isProcessing = false;
    }
}

const requestQueue = new RequestQueue();

class RemoteBackend implements IBackend {
    private async fetchWithTimeout(resource: RequestInfo, options: RequestInit = {}) {
        const { timeout = 10000 } = options as any;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(resource, { ...options, signal: controller.signal });
            clearTimeout(id);
            return response;
        } catch (e: any) {
            clearTimeout(id);
            throw e;
        }
    }

    // --- Authentication & Onboarding ---

    async login(email: string, pass: string): Promise<any> {
        const res = await this.fetchWithTimeout(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Login failed');
        }

        return data; // Expected { token: string, user: object }
    }

    async registerTenant(payload: any): Promise<any> {
        // payload should contain: { clinicName, country, adminUser: { email, password, name... }, plan... }
        const res = await this.fetchWithTimeout(`${API_URL}/auth/register-tenant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Registration failed");
        }
        return data;
    }

    async forgotPassword(email: string): Promise<void> {
        const res = await this.fetchWithTimeout(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || "Failed to process request");
        }
    }

    async verifyPayment(txId: string, planConfig: any): Promise<boolean> {
        try {
            const res = await this.fetchWithTimeout(`${API_URL}/billing/verify`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ txId, planConfig })
            });
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    // --- Data Access ---

    async getCollection(collectionName: string): Promise<Document[]> {
        try {
            const res = await this.fetchWithTimeout(`${API_URL}/${collectionName}`, { headers: getHeaders() });
            if (!res.ok) throw new Error(res.statusText);
            return await res.json();
        } catch (e) {
            return [];
        }
    }

    async find(collectionName: string, query: Record<string, any>): Promise<Document[]> {
        const all = await this.getCollection(collectionName);
        return all.filter(doc => Object.keys(query).every(key => doc[key] === query[key]));
    }

    async findById(collectionName: string, id: string): Promise<Document | undefined> {
        try {
            const res = await this.fetchWithTimeout(`${API_URL}/${collectionName}/${encodeURIComponent(id)}`, { headers: getHeaders() });
            if (!res.ok) return undefined;
            return await res.json();
        } catch (e) { return undefined; }
    }

    async insert(collectionName: string, data: Document): Promise<Document> {
        const url = collectionName === 'sales' ? `${API_URL}/sales` : `${API_URL}/${collectionName}`;
        try {
            const res = await this.fetchWithTimeout(url, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Insert failed");
            return await res.json();
        } catch (e) {
            requestQueue.enqueue('POST', url, data);
            return { ...data, id: 'temp_' + Date.now() };
        }
    }

    async update(collectionName: string, id: string, data: Partial<Document>): Promise<Document | null> {
        const url = `${API_URL}/${collectionName}/${encodeURIComponent(id)}`;
        try {
            const res = await this.fetchWithTimeout(url, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            requestQueue.enqueue('PUT', url, data);
            return { id, ...data } as Document;
        }
    }

    async remove(collectionName: string, id: string): Promise<boolean> {
        const url = `${API_URL}/${collectionName}/${encodeURIComponent(id)}`;
        try {
            const res = await this.fetchWithTimeout(url, { method: 'DELETE', headers: getHeaders() });
            return res.ok;
        } catch (e) {
            requestQueue.enqueue('DELETE', url);
            return true;
        }
    }

    async getFullState(): Promise<any> {
        requestQueue.process();
        if (!getToken()) return {};

        try {
            const res = await this.fetchWithTimeout(`${API_URL}/sync/bootstrap`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                return data; // Return whatever the database has, even if empty
            } else {
                if (res.status === 401) return {};
                throw new Error("Sync failed");
            }
        } catch (e) {
            console.error("Sync failed, returning empty state", e);
            return {}; // Return empty state, no mock data
        }
    }
}

export const backend = new RemoteBackend();