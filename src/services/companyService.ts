import httpClient from './httpClient';

export interface Company {
  id: string;
  businessName: string;
  ruc: string;
  isActive: boolean;
  logo: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface UpdateCompanyDto {
  businessName: string;
  ruc: string;
  logo?: string;
  isActive: boolean;
}

export const companyService = {
  // Obtener empresa por ID
  async getCompanyById(id: string): Promise<Company> {
    const response = await httpClient.get<Company>(`/api/companies/${id}`);
    return response.data;
  },

  // Actualizar empresa
  async updateCompany(id: string, data: UpdateCompanyDto): Promise<Company> {
    const response = await httpClient.put<Company>(`/api/companies/${id}`, data);
    return response.data;
  },
};
