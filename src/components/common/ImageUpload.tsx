import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface ImageUploadProps {
  currentImage?: string | null;
  onImageChange: (base64: string) => void;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImage,
  onImageChange,
  maxWidth = 400,
  maxHeight = 400,
  quality = 0.8,
  disabled = false,
}) => {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calcular nuevas dimensiones manteniendo la proporción
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo obtener el contexto del canvas'));
            return;
          }

          // Dibujar la imagen redimensionada
          ctx.drawImage(img, 0, 0, width, height);

          // Convertir a base64
          const base64 = canvas.toDataURL('image/png', quality);
          resolve(base64);
        };

        img.onerror = () => {
          reject(new Error('Error al cargar la imagen'));
        };

        img.src = e.target?.result as string;
      };

      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };

      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor seleccione un archivo de imagen válido');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB');
      return;
    }

    try {
      setIsProcessing(true);
      const resizedBase64 = await resizeImage(file);
      setPreview(resizedBase64);
      onImageChange(resizedBase64);
    } catch (error) {
      console.error('Error al procesar la imagen:', error);
      alert('Error al procesar la imagen. Por favor intente con otra imagen.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onImageChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <Label>Logo de la Empresa</Label>
      
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div className="relative">
          <div className="w-40 h-40 border-2 border-dashed border-border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
            {preview ? (
              <img
                src={preview}
                alt="Logo preview"
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <div className="text-center p-4">
                <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Sin logo</p>
              </div>
            )}
          </div>
          
          {preview && !disabled && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
              onClick={handleRemove}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Upload controls */}
        <div className="flex-1 space-y-3">
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={handleClick}
              disabled={disabled || isProcessing}
              className="w-full sm:w-auto"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isProcessing ? 'Procesando...' : preview ? 'Cambiar Logo' : 'Subir Logo'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={disabled}
            />
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Formatos aceptados: JPG, PNG, GIF</p>
            <p>• Tamaño máximo: 5MB</p>
            <p>• Resolución recomendada: {maxWidth}x{maxHeight}px</p>
            <p>• La imagen se redimensionará automáticamente</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
