
import { Tenant } from '../types';

export const generateClinicAcronym = (name: string): string => {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 3); // Max 3 chars
};

export const generateClientId = (tenant: Tenant, count: number): string => {
    const acronym = generateClinicAcronym(tenant.name);
    const year = new Date().getFullYear();
    const serial = (count + 1).toString().padStart(3, '0');
    return `${acronym}/${serial}/${year}`;
};

export const generateInvoiceId = (count: number): string => {
    const year = new Date().getFullYear();
    const serial = (count + 1).toString().padStart(4, '0');
    return `IV/${serial}/${year}`;
};

export const generateReceiptId = (tenant: Tenant | undefined, count: number): string => {
    const acronym = tenant ? generateClinicAcronym(tenant.name) : 'VN';
    const year = new Date().getFullYear();
    const serial = (count + 1).toString().padStart(4, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `RC/${acronym}/${serial}/${random}/${year}`;
};
