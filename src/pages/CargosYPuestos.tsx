import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMessage } from '@/contexts/MessageContext';
import { cargosService, type Cargo } from '@/services/cargosService';
import { puestosService, type Puesto } from '@/services/puestosService';
import CargosList from '@/components/cargos/CargosList';
import PuestosList from '@/components/cargos/PuestosList';

const CargosYPuestos: React.FC = () => {
  const { showMessage } = useMessage();
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [selectedCargo, setSelectedCargo] = useState<Cargo | null>(null);
  const [searchCargo, setSearchCargo] = useState('');
  const [searchPuesto, setSearchPuesto] = useState('');
  const [isLoadingCargos, setIsLoadingCargos] = useState(true);
  const [isLoadingPuestos, setIsLoadingPuestos] = useState(false);

  // Cargar cargos al montar el componente
  useEffect(() => {
    loadCargos();
  }, []);

  // Cargar puestos cuando se selecciona un cargo
  useEffect(() => {
    if (selectedCargo) {
      loadPuestos(selectedCargo._id);
    } else {
      setPuestos([]);
    }
  }, [selectedCargo]);

  const loadCargos = async () => {
    try {
      setIsLoadingCargos(true);
      const data = await cargosService.getCargos();
      setCargos(data);
      
      // Seleccionar el primer cargo por defecto
      if (data.length > 0 && !selectedCargo) {
        setSelectedCargo(data[0]);
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Error al cargar los cargos');
    } finally {
      setIsLoadingCargos(false);
    }
  };

  const loadPuestos = async (cargoId: string) => {
    try {
      setIsLoadingPuestos(true);
      const data = await puestosService.getPuestosByCargoId(cargoId);
      setPuestos(data);
    } catch (error: any) {
      showMessage('error', error.message || 'Error al cargar los puestos');
    } finally {
      setIsLoadingPuestos(false);
    }
  };

  const handleCargoSelect = (cargo: Cargo) => {
    setSelectedCargo(cargo);
  };

  const handleCargoCreated = () => {
    loadCargos();
    showMessage('success', 'Cargo creado exitosamente');
  };

  const handleCargoUpdated = () => {
    loadCargos();
    showMessage('success', 'Cargo actualizado exitosamente');
  };

  const handleCargoDeleted = () => {
    loadCargos();
    setSelectedCargo(null);
    showMessage('success', 'Cargo desactivado exitosamente');
  };

  const handlePuestoCreated = () => {
    if (selectedCargo) {
      loadPuestos(selectedCargo._id);
    }
    showMessage('success', 'Puesto creado exitosamente');
  };

  const handlePuestoUpdated = () => {
    if (selectedCargo) {
      loadPuestos(selectedCargo._id);
    }
    showMessage('success', 'Puesto actualizado exitosamente');
  };

  const handlePuestoDeleted = () => {
    if (selectedCargo) {
      loadPuestos(selectedCargo._id);
    }
    showMessage('success', 'Puesto desactivado exitosamente');
  };

  // Filtrar cargos por búsqueda
  const filteredCargos = cargos.filter(cargo =>
    cargo.Nombre.toLowerCase().includes(searchCargo.toLowerCase()) ||
    cargo.Descripcion.toLowerCase().includes(searchCargo.toLowerCase())
  );

  // Filtrar puestos por búsqueda
  const filteredPuestos = puestos.filter(puesto =>
    puesto.Nombre.toLowerCase().includes(searchPuesto.toLowerCase()) ||
    puesto.Descripcion.toLowerCase().includes(searchPuesto.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Cargos y Puestos</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona la estructura de cargos y puestos
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Cargos Section */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Cargos</h2>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar cargo..."
              value={searchCargo}
              onChange={(e) => setSearchCargo(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Cargos List */}
          <CargosList
            cargos={filteredCargos}
            selectedCargo={selectedCargo}
            isLoading={isLoadingCargos}
            onCargoSelect={handleCargoSelect}
            onCargoCreated={handleCargoCreated}
            onCargoUpdated={handleCargoUpdated}
            onCargoDeleted={handleCargoDeleted}
          />
        </div>

        {/* Puestos Section */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              {selectedCargo ? `Puestos - ${selectedCargo.Nombre}` : 'Puestos'}
            </h2>
          </div>

          {selectedCargo ? (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar puesto..."
                  value={searchPuesto}
                  onChange={(e) => setSearchPuesto(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Puestos List */}
              <PuestosList
                puestos={filteredPuestos}
                selectedCargoId={selectedCargo._id}
                isLoading={isLoadingPuestos}
                onPuestoCreated={handlePuestoCreated}
                onPuestoUpdated={handlePuestoUpdated}
                onPuestoDeleted={handlePuestoDeleted}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Selecciona un cargo para ver sus puestos
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CargosYPuestos;
