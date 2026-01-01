
import { AppState, ChatMessage } from '../types';

export interface Document {
    id: string;
    [key: string]: any;
}

const API_URL = '/api';

interface IBackend {
    getCollection(collectionName: string): Promise<Document[]>;
    find(collectionName: string, query: Record<string, any>): Promise<Document[]>;
    findById(collectionName: string, id: string): Promise<Document | undefined>;
    insert(collectionName: string, data: Document): Promise<Document>;
    update(collectionName: string, id: string, data: Partial<Document>): Promise<Document | null>;
    remove(collectionName: string, id: string): Promise<boolean>;
    getFullState(): Promise<any>;
    registerTenant(data: any): Promise<any>;
    verifyPayment(txId: string, planConfig: any): Promise<boolean>;
    getChats(): Promise<ChatMessage[]>;
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

// --- Offline logic removed as per user request ---

class RemoteBackend implements IBackend {
    private async fetchWithTimeout(resource: RequestInfo, options: RequestInit = {}) {
        const { timeout = 30000 } = options as any;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(resource, { ...options, signal: controller.signal });
            clearTimeout(id);
            return response;
        } catch (e) {
            clearTimeout(id);
            throw e;
        }
    }

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
            const res = await this.fetchWithTimeout(`${API_URL}/${collectionName}/${id}`, { headers: getHeaders() });
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
            if (res.ok) return await res.json();

            // If it's a conflict, the record is already in the DB (deduplication success)
            if (res.status === 409) {
                console.info(`Record ${data.id} already exists on server. Considering as synced.`);
                return data;
            }

            // For other bad requests (400), don't retry but report it
            if (res.status === 400) {
                console.error(`Invalid record data for ${data.id}. Status 400.`);
                return data;
            }

            throw new Error("Insert failed");
        } catch (e) {
            console.error("API Insert Error:", e);
            throw e;
        }
    }

    async update(collectionName: string, id: string, data: Partial<Document>): Promise<Document | null> {
        const url = `${API_URL}/${collectionName}/${id}`;
        try {
            const res = await this.fetchWithTimeout(url, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            return data as Document;
        }
    }

    async remove(collectionName: string, id: string): Promise<boolean> {
        const url = `${API_URL}/${collectionName}/${id}`;
        try {
            const res = await this.fetchWithTimeout(url, { method: 'DELETE', headers: getHeaders() });
            return res.ok;
        } catch (e) {
            return true;
        }
    }

    async registerTenant(data: any): Promise<any> {
        const res = await this.fetchWithTimeout(`${API_URL}/auth/register-tenant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Registration failed");
        }
        return await res.json();
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

    async getFullState(): Promise<any> {
        if (!getToken()) return {};

        try {
            const res = await this.fetchWithTimeout(`${API_URL}/sync/bootstrap`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                // If we get a valid response, TRUST IT. Even if users is empty (which shouldn't happen for logged in user, but better than mocks).
                // if (!data.users || data.users.length === 0) return this.getMocks(); 
                return data;
            } else {
                if (res.status === 401) {
                    localStorage.removeItem('vet_token'); // Clear invalid token
                    return {};
                }
                throw new Error(`Sync failed: ${res.status}`);
            }
        } catch (e) {
            console.error("Sync failed, returning empty state or existing cache (not mocks)", e);
            // Returning mocks hides the error and confuses the user. better to return empty object or let the app handle it.
            return {};
        }
    }

    async getChats(): Promise<ChatMessage[]> {
        if (!getToken()) return [];
        try {
            const res = await this.fetchWithTimeout(`${API_URL}/sync/chats`, { headers: getHeaders() });
            if (res.ok) return await res.json();
            return [];
        } catch (e) {
            return [];
        }
    }
}

export const backend = new RemoteBackend();
