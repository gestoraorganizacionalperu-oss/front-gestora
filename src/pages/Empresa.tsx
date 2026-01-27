import React, { useState, useEffect } from 'react';
import { Edit, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMessage } from '@/contexts/MessageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/use-permissions';
import { companyService, type Company } from '@/services/companyService';
import ImageUpload from '@/components/common/ImageUpload';

const Empresa: React.FC = () => {
  const { showMessage } = useMessage();
  const { user } = useAuth();
  const { canUpdate } = usePermissions();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    ruc: '',
    logo: '',
  });

  // Obtener el companyId del usuario logueado
  const companyId = user?.empresa_id || '6907a5a21f9a5744d381627b';

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      setIsLoading(true);
      const data = await companyService.getCompanyById(companyId);
      setCompany(data);
      setFormData({
        businessName: data.businessName,
        ruc: data.ruc,
        logo: data.logo || '',
      });
    } catch (error: any) {
      showMessage('error', error.message || 'Error al cargar la información de la empresa');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (company) {
      setFormData({
        businessName: company.businessName,
        ruc: company.ruc,
        logo: company.logo || '',
      });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!formData.businessName.trim()) {
      showMessage('warning', 'La razón social es requerida');
      return;
    }

    if (!formData.ruc.trim()) {
      showMessage('warning', 'El RUC es requerido');
      return;
    }

    try {
      setIsSaving(true);
      const updatedCompany = await companyService.updateCompany(companyId, {
        businessName: formData.businessName.trim(),
        ruc: formData.ruc.trim(),
        logo: formData.logo || '',
        isActive: true,
      });
      
      setCompany(updatedCompany);
      
      // Actualizar el logo en localStorage para uso global
      if (updatedCompany.logo) {
        localStorage.setItem('companyLogo', updatedCompany.logo);
      } else {
        localStorage.removeItem('companyLogo');
      }
      
      setIsEditing(false);
      showMessage('success', 'Información actualizada exitosamente');
    } catch (error: any) {
      showMessage('error', error.message || 'Error al actualizar la información');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoChange = (base64: string) => {
    setFormData({ ...formData, logo: base64 });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No se encontró información de la empresa</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Información de la Empresa</h1>
          <p className="text-muted-foreground mt-1">Gestiona los datos de tu empresa</p>
        </div>
        {!isEditing && canUpdate && (
          <Button onClick={handleEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        )}
      </div>

      {/* Formulario */}
      <div className="border rounded-lg p-6 bg-card">
        <div className="space-y-6">
          {/* Razón Social y RUC */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="businessName">Razón Social</Label>
              {isEditing ? (
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  disabled={isSaving}
                />
              ) : (
                <div className="text-2xl font-bold text-foreground">{company.businessName}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ruc">RUC</Label>
              {isEditing ? (
                <Input
                  id="ruc"
                  value={formData.ruc}
                  onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                  disabled={isSaving}
                />
              ) : (
                <div className="text-2xl font-bold text-foreground">{company.ruc}</div>
              )}
            </div>
          </div>

          {/* Logo */}
          {isEditing ? (
            <ImageUpload
              currentImage={formData.logo}
              onImageChange={handleLogoChange}
              maxWidth={400}
              maxHeight={400}
              quality={0.8}
              disabled={isSaving}
            />
          ) : (
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-start gap-4">
                {company.logo ? (
                  <div className="w-40 h-40 border-2 border-border rounded-lg overflow-hidden bg-muted flex items-center justify-center p-2">
                    <img
                      src={company.logo}
                      alt="Logo de la empresa"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-40 h-40 border-2 border-dashed border-border rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">Sin logo</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botones de acción */}
          {isEditing && (
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Empresa;
