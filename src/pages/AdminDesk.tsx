import React, { useState } from 'react';
import { LogEntry } from '../components/admin-desk/adminDeskTypes';
import { useAdminDeskData } from '../components/admin-desk/useAdminDeskData';
import { AdminDeskLoginModal } from '../components/admin-desk/AdminDeskLoginModal';
import { AdminDeskRowEditorModal } from '../components/admin-desk/AdminDeskRowEditorModal';
import { AdminDeskClassicLayout } from '../components/admin-desk/AdminDeskClassicLayout';

interface AdminDeskProps {
  isAdmin?: boolean;
  systemLogs?: LogEntry[];
  onClearLogs?: () => void;
  onClose?: () => void;
  onLogin?: () => void;
  onNavigate?: (page: any) => Promise<any>;
}

export default function AdminDesk({
  isAdmin = false,
  onClose
}: AdminDeskProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(isAdmin);

  // Data & Master Hook
  const {
    tables,
    selectedTable,
    setSelectedTable,
    data,
    loading,
    searchTerm,
    setSearchTerm,
    editingRow,
    setEditingRow,
    isNewRow,
    setIsNewRow,
    currentColumns,
    editorColumns,
    fetchData,
    handleSave,
    handleDelete,
    handleCsvImport,
    handleDatabaseExport,
    isExporting
  } = useAdminDeskData({ isAuthenticated });

  // Authentication Guard
  if (!isAuthenticated) {
    return (
      <AdminDeskLoginModal
        onSuccess={() => setIsAuthenticated(true)}
      />
    );
  }

  return (
    <div className="w-full h-full font-sans text-slate-800 flex flex-col overflow-hidden">
      {/* 1. Row Editor Modal Overlay */}
      {editingRow && (
        <AdminDeskRowEditorModal
          editingRow={editingRow}
          setEditingRow={setEditingRow}
          isNewRow={isNewRow}
          selectedTable={selectedTable}
          editorColumns={editorColumns}
          currentColumns={currentColumns}
          data={data}
          loading={loading}
          onSave={handleSave}
          onClose={() => setEditingRow(null)}
        />
      )}

      {/* 2. Main Row Data Browser Console */}
      <AdminDeskClassicLayout
        tables={tables}
        selectedTable={selectedTable}
        setSelectedTable={setSelectedTable}
        data={data}
        loading={loading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        currentColumns={currentColumns}
        editorColumns={editorColumns}
        setEditingRow={setEditingRow}
        setIsNewRow={setIsNewRow}
        handleDelete={handleDelete}
        handleCsvImport={handleCsvImport}
        handleDatabaseExport={handleDatabaseExport}
        isExporting={isExporting}
        fetchData={fetchData}
        onClose={onClose}
      />
    </div>
  );
}
