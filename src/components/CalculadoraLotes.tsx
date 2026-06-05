/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Percent, Wallet, ArrowRight, ShieldAlert, FileSliders, ChevronDown, ChevronRight } from 'lucide-react';

interface CalculadoraLotesProps {
  key?: any;
  title?: string;
  description?: string;
}

export default function CalculadoraLotes({ title, description }: CalculadoraLotesProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [balance, setBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [stopLoss, setStopLoss] = useState<number>(15);
  const [assetType, setAssetType] = useState<string>('forex'); // forex, gold, indices

  // Calculate position size
  const riskAmount = (balance * riskPercent) / 100;
  
  let pipValueMultiplier = 10; // For EURUSD, 1 standard lot = $10 per pip
  if (assetType === 'gold') {
    pipValueMultiplier = 100; // Gold: 1 lot = $100 per point/dollar
  } else if (assetType === 'indices') {
    pipValueMultiplier = 1; // Indices: 1 lot = $1 per point (like US30, NAS100)
  }

  const lotSize = stopLoss > 0 ? riskAmount / (stopLoss * pipValueMultiplier) : 0;

  return (
    <div id="calc-lotes-container" className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl backdrop-blur-md transition-all">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left focus:outline-none cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400 group-hover:scale-105 transition-all">
            <FileSliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-sans font-semibold text-lg text-white group-hover:text-violet-400 transition-colors flex items-center gap-2">
              {isOpen ? <ChevronDown className="w-4 h-4 text-purple-400" /> : <ChevronRight className="w-4 h-4 text-purple-400" />}
              {title || "Calculadora de Lotaje"}
            </h3>
            <p className="text-xs text-zinc-400 font-mono text-left">{description || "GESTIÓN DE RIESGO PROFESIONAL"}</p>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-zinc-800/80 animate-fade-in">
          {/* Inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Activo / Instrumento</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'forex', label: 'EURUSD / Forex' },
                  { id: 'gold', label: 'ORO (XAUUSD)' },
                  { id: 'indices', label: 'US30 / NAS100' }
                ].map((act) => (
                  <button
                    id={`asset-btn-${act.id}`}
                    key={act.id}
                    onClick={() => setAssetType(act.id)}
                    className={`py-2 px-3 text-xs rounded-xl border transition-all text-center ${
                      assetType === act.id 
                      ? 'bg-violet-500/25 border-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.15)]' 
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Balance de la Cuenta (USD)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                <input
                  id="calc-input-balance"
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-8 pr-4 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Riesgo (%)</label>
                <div className="relative">
                  <input
                    id="calc-input-risk"
                    type="number"
                    step="0.1"
                    value={riskPercent}
                    onChange={(e) => setRiskPercent(Math.max(0.1, Number(e.target.value)))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Stop Loss (Pips/Puntos)</label>
                <input
                  id="calc-input-sl"
                  type="number"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Results Card */}
          <div className="flex flex-col justify-between p-5 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl shadow-inner">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-zinc-400 uppercase tracking-wider font-mono">Dinero Arriesgado</span>
                <div className="text-2xl font-bold font-sans text-rose-400 mt-1">
                  ${riskAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </div>
              </div>

              <div className="h-[1px] bg-zinc-800" />

              <div>
                <span className="text-xs text-zinc-400 uppercase tracking-wider font-mono">Lotes Recomendados</span>
                <div className="text-4xl font-extrabold font-sans text-blue-400 tracking-tight mt-1">
                  {lotSize.toFixed(2)} <span className="text-sm font-medium text-zinc-500 font-mono">LOTES</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1 font-mono">
                  {assetType === 'forex' && '1 Lot = 100k unidades ($10/pip)'}
                  {assetType === 'gold' && '1 Lot = 100 onzas ($100/punto)'}
                  {assetType === 'indices' && '1 Lot = $1 por punto'}
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-zinc-400 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
              <span>
                Verifica el apalancamiento y tamaño de contrato de tu Broker antes de colocar la orden.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
