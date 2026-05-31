/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ShieldAlert, Calculator, ChevronDown, ChevronRight } from 'lucide-react';

interface FutureAssetDef {
  id: string;
  name: string;
  fullName: string;
  pointValue: number; // Value in $ per 1 full point
  tickSize: number;   // Size of 1 tick (e.g. 0.25)
  tickValue: number;  // Value in $ per 1 tick
  typicalDayMargin: number; // Day trading margin estimation in USD
}

const FUTURE_ASSETS: FutureAssetDef[] = [
  { id: 'NQ', name: 'NQ', fullName: 'Nasdaq 100 E-mini', pointValue: 20, tickSize: 0.25, tickValue: 5.0, typicalDayMargin: 1000 },
  { id: 'MNQ', name: 'MNQ', fullName: 'Micro Nasdaq 100', pointValue: 2, tickSize: 0.25, tickValue: 0.5, typicalDayMargin: 100 },
  { id: 'ES', name: 'ES', fullName: 'S&P 500 E-mini', pointValue: 50, tickSize: 0.25, tickValue: 12.5, typicalDayMargin: 1000 },
  { id: 'MES', name: 'MES', fullName: 'Micro S&P 500', pointValue: 5, tickSize: 0.25, tickValue: 1.25, typicalDayMargin: 100 },
  { id: 'YM', name: 'YM', fullName: 'Dow Jones E-mini', pointValue: 5, tickSize: 1.0, tickValue: 5.0, typicalDayMargin: 1000 },
  { id: 'MYM', name: 'MYM', fullName: 'Micro Dow Jones', pointValue: 0.5, tickSize: 1.0, tickValue: 0.5, typicalDayMargin: 100 },
  { id: 'RTY', name: 'RTY', fullName: 'Russell 2000 E-mini', pointValue: 50, tickSize: 0.1, tickValue: 5.0, typicalDayMargin: 1000 },
  { id: 'MRTY', name: 'MRTY', fullName: 'Micro Russell 2000', pointValue: 5, tickSize: 0.1, tickValue: 0.5, typicalDayMargin: 100 }
];

export default function CalculadoraApalancamiento() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('MNQ');
  const [balance, setBalance] = useState<number>(10000);
  const [riskType, setRiskType] = useState<'percent' | 'contracts'>('percent');
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [contractsInput, setContractsInput] = useState<number>(2);
  const [stopLossPoints, setStopLossPoints] = useState<number>(25);

  const activeAsset = FUTURE_ASSETS.find(a => a.id === selectedAssetId) || FUTURE_ASSETS[1];

  // Dynamic calculations based on option selected
  let riskAmount = 0;
  let activeContracts = 0;
  let activeRiskPercent = 0;

  if (riskType === 'percent') {
    riskAmount = (balance * riskPercent) / 100;
    activeContracts = stopLossPoints > 0 ? riskAmount / (stopLossPoints * activeAsset.pointValue) : 0;
    activeRiskPercent = riskPercent;
  } else {
    activeContracts = contractsInput;
    riskAmount = contractsInput * stopLossPoints * activeAsset.pointValue;
    activeRiskPercent = balance > 0 ? (riskAmount / balance) * 100 : 0;
  }

  // Margin estimation
  const marginRequired = activeAsset.typicalDayMargin * Math.floor(activeContracts || 1);

  // Equivalencia en Ticks: stop loss points / tick size
  const stopLossTicks = activeAsset.tickSize > 0 ? stopLossPoints / activeAsset.tickSize : 0;

  return (
    <div id="calc-apalan-container" className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl backdrop-blur-md transition-all">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left focus:outline-none cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-400 group-hover:scale-105 transition-all">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-sans font-semibold text-lg text-white group-hover:text-pink-400 transition-colors flex items-center gap-2">
              {isOpen ? <ChevronDown className="w-4 h-4 text-pink-400" /> : <ChevronRight className="w-4 h-4 text-pink-400" />}
              Calculadora de Riesgo
            </h3>
            <p className="text-xs text-zinc-400 font-mono font-medium tracking-wider">CÁLCULO EXCLUSIVO DE RIESGO CME EN TIEMPO REAL</p>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-zinc-800/80 animate-fade-in">
          {/* Controls */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">Activo CME</label>
              <div className="grid grid-cols-4 gap-2">
                {FUTURE_ASSETS.map((asset) => (
                  <button
                    id={`future-btn-${asset.id}`}
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={`py-1.5 px-2 text-xs font-bold rounded-xl border transition-all text-center ${
                      selectedAssetId === asset.id 
                      ? 'bg-pink-500/25 border-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.15)]' 
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {asset.name}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1.5 italic font-sans font-medium">
                {activeAsset.fullName} — 1 Punto = ${activeAsset.pointValue} USD  •  1 Tick ({activeAsset.tickSize}) = ${activeAsset.tickValue} USD
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">BALANCE DE LA CUENTA (USD)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                <input
                  id="future-input-balance"
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-8 pr-4 text-sm text-white focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>
            </div>

            {/* Selector de tipo de riesgo */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">MODO DE ENTRADA DE RIESGO</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRiskType('percent')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                    riskType === 'percent'
                      ? 'bg-zinc-800 border-pink-500/50 text-white font-black'
                      : 'bg-zinc-950/50 border-zinc-900 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Riesgo por %
                </button>
                <button
                  type="button"
                  onClick={() => setRiskType('contracts')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                    riskType === 'contracts'
                      ? 'bg-zinc-800 border-pink-500/50 text-white font-black'
                      : 'bg-zinc-950/50 border-zinc-900 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Contratos directos
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {riskType === 'percent' ? (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">RIESGO (%)</label>
                  <div className="relative">
                    <input
                      id="future-input-risk"
                      type="number"
                      step="0.1"
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(Math.max(0.1, Number(e.target.value)))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-pink-500 font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-550 font-mono">%</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">CONTRATOS</label>
                  <input
                    id="future-input-contracts"
                    type="number"
                    value={contractsInput}
                    onChange={(e) => setContractsInput(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-pink-500 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">STOP LOSS (PUNTOS)</label>
                <input
                  id="future-input-sl-points"
                  type="number"
                  value={stopLossPoints}
                  onChange={(e) => setStopLossPoints(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Results Card */}
          <div className="flex flex-col justify-between p-5 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl shadow-inner">
            <div className="space-y-4">
              {/* Equivalencia en Ticks */}
              <div>
                <span className="text-xs text-zinc-400 uppercase tracking-wider font-mono">Equivalencia en Ticks</span>
                <div className="text-2xl font-black font-sans text-emerald-450 tracking-tight mt-1">
                  {stopLossTicks.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-sm font-medium text-zinc-550 font-mono">TICKS</span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                  Cada Tick equivale a <strong className="text-zinc-300">${activeAsset.tickValue} USD</strong> por contrato.
                </p>
              </div>

              <div className="h-[1px] bg-zinc-800" />

              {/* Contratos */}
              <div>
                <span className="text-xs text-zinc-400 uppercase tracking-wider font-mono">
                  {riskType === 'percent' ? 'Contratos Recomendados' : 'Contratos Elegidos'}
                </span>
                <div className="text-4xl font-extrabold font-sans text-pink-400 tracking-tight mt-1">
                  {activeContracts.toFixed(2)} <span className="text-sm font-medium text-zinc-500 font-mono">CONTRATOS</span>
                </div>
                {riskType === 'percent' && (
                  <p className="text-xs text-zinc-500 mt-1.2 font-mono">
                    Sugerencia entera redondeada: <strong className="text-zinc-300">{Math.floor(activeContracts)} contratos</strong>
                  </p>
                )}
              </div>

              <div className="h-[1px] bg-zinc-800" />

              {/* Dinero Arriesgado & Margen */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-black/35 p-2 rounded-xl border border-zinc-800/40">
                  <span className="text-zinc-400 text-[11px] uppercase tracking-wider font-mono">Dinero Arriesgado</span>
                  <span className="text-rose-450 font-black font-mono text-[13px]">
                    ${riskAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD <span className="text-zinc-550 text-[10px]">({activeRiskPercent.toFixed(2)}%)</span>
                  </span>
                </div>

                <div className="flex justify-between items-center p-2">
                  <span className="text-zinc-400 text-xs uppercase tracking-wider font-mono" title="Garantía estimada sugerida para operativa Intradía (brokers como NinjaTrader / AMP)">Margen Intradía Estimado</span>
                  <span className="text-amber-400 font-bold font-mono text-sm">${marginRequired.toLocaleString()} USD</span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 text-xs text-zinc-400 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
              <span>
                Verifica las garantías y el apalancamiento de tu Broker de Futuros (ej. NinjaTrader, Rithmic) antes de operar.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
