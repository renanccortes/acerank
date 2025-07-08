import React, { useState, useRef } from 'react';
import { Camera, Upload, X, User } from 'lucide-react';
import { uploadAPI } from '../lib/api';
import { toast } from 'sonner';

const PhotoUpload = ({ 
  type = 'profile', // 'profile' ou 'match'
  matchId = null,
  currentPhoto = null,
  onPhotoUploaded = () => {},
  className = ''
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentPhoto);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleUpload = async (file) => {
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploading(true);

    try {
      let response;
      
      if (type === 'profile') {
        response = await uploadAPI.uploadProfilePhoto(file);
      } else if (type === 'match' && matchId) {
        response = await uploadAPI.uploadMatchPhoto(matchId, file);
      } else {
        throw new Error('Tipo de upload inválido');
      }

      // Criar preview local
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
      };
      reader.readAsDataURL(file);

      toast.success(response.data.message);
      onPhotoUploaded(response.data.photoUrl);

    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error(error.response?.data?.message || 'Erro ao fazer upload da foto');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (type !== 'profile') return;

    try {
      await uploadAPI.removeProfilePhoto();
      setPreview(null);
      toast.success('Foto removida com sucesso');
      onPhotoUploaded(null);
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      toast.error('Erro ao remover foto');
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`photo-upload ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {type === 'profile' ? (
        <div className="flex flex-col items-center space-y-4">
          {/* Avatar/Preview */}
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-lg">
              {preview ? (
                <img
                  src={preview}
                  alt="Foto de perfil"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <User className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>

            {/* Botão de upload sobreposto */}
            <button
              onClick={openFileDialog}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Botões de ação */}
          <div className="flex space-x-2">
            <button
              onClick={openFileDialog}
              disabled={uploading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>{preview ? 'Alterar Foto' : 'Adicionar Foto'}</span>
            </button>

            {preview && (
              <button
                onClick={handleRemovePhoto}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Remover</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        // Upload para foto de partida
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
          {preview ? (
            <div className="space-y-4">
              <img
                src={preview}
                alt="Foto da partida"
                className="max-w-full h-48 object-cover rounded-lg mx-auto"
              />
              <button
                onClick={openFileDialog}
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {uploading ? 'Enviando...' : 'Alterar Foto'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <Camera className="w-12 h-12 text-gray-400 mx-auto" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Adicionar foto da partida
                </h3>
                <p className="text-gray-500">
                  Compartilhe uma selfie ou foto da partida
                </p>
              </div>
              <button
                onClick={openFileDialog}
                disabled={uploading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2 mx-auto"
              >
                <Upload className="w-5 h-5" />
                <span>{uploading ? 'Enviando...' : 'Selecionar Foto'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;

