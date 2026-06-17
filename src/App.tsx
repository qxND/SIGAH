/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Alunos from '@/pages/Alunos';
import Professores from '@/pages/Professores';
import Disciplinas from '@/pages/Disciplinas';
import Turmas from '@/pages/Turmas';
import Login from '@/pages/Login';

// Component to protect routes
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes wrapped in AppLayout via ProtectedRoute component */}
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/alunos" element={
          <ProtectedRoute>
            <Alunos />
          </ProtectedRoute>
        } />
        <Route path="/professores" element={
          <ProtectedRoute>
            <Professores />
          </ProtectedRoute>
        } />
        <Route path="/disciplinas" element={
          <ProtectedRoute>
            <Disciplinas />
          </ProtectedRoute>
        } />
        <Route path="/turmas" element={
          <ProtectedRoute>
            <Turmas />
          </ProtectedRoute>
        } />
        
        {/* Fallback for other routes */}
        <Route path="*" element={
          <ProtectedRoute>
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <h2 className="text-xl font-semibold">Em desenvolvimento</h2>
              <p>Esta funcionalidade será implementada em breve.</p>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}
