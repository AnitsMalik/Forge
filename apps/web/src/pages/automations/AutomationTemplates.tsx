import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Zap,
  ShoppingBag,
  FolderSync,
  Activity,
  Clock,
  ArrowRight,
  Layers,
  CheckCircle2,
  Share2,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import { api } from '../../services/api';

export const AutomationTemplates: React.FC = () => {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deployingId, setDeployingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRecipes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.automations.listRecipes();
      const list = Array.isArray(res?.recipes) ? res.recipes : Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setRecipes(list);
    } catch (err: any) {
      console.error('Failed to load automation recipes:', err);
      setError(err.message || 'Unable to load prebuilt recipes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const handleDeployRecipe = async (recipe: any) => {
    setDeployingId(recipe.id);
    try {
      const res = await api.automations.instantiateRecipe(recipe.id, {
        customName: `${recipe.title} (Live)`,
      });
      const createdId = res?.id || res?.data?.id;
      if (createdId) {
        navigate(`/automations/${createdId}`);
      } else {
        navigate('/automations');
      }
    } catch (err: any) {
      setError(`Deployment failed: ${err.message}`);
    } finally {
      setDeployingId(null);
    }
  };

  const getRecipeIcon = (recipe: any) => {
    if (recipe.id === 'outperformer-amplification') return Trophy;
    if (recipe.id === 'flagship-product-promotion' || recipe.id === 'product-promotion') return Sparkles;
    if (recipe.requiredConnectors?.includes('google-sheets')) return FileSpreadsheet;
    if (recipe.requiredConnectors?.includes('google-drive')) return FolderSync;
    if (recipe.requiredConnectors?.includes('shopify')) return ShoppingBag;
    return Zap;
  };

  const getRecipeColor = (recipe: any) => {
    if (recipe.id === 'outperformer-amplification') return '#f59e0b';
    if (recipe.id === 'flagship-product-promotion' || recipe.id === 'product-promotion') return '#c084fc';
    if (recipe.requiredConnectors?.includes('google-sheets')) return '#10b981';
    if (recipe.requiredConnectors?.includes('google-drive')) return '#38bdf8';
    if (recipe.requiredConnectors?.includes('shopify')) return '#95BF47';
    return '#818cf8';
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] font-sans antialiased p-6 md:p-10 space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/automations')}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Automations</span>
          </button>
          <div className="h-4 w-[1px] bg-white/15" />
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
            <span>Workflows</span>
            <span>/</span>
            <span className="text-purple-400 font-semibold">Prebuilt Recipes</span>
          </div>
        </div>

        <button
          onClick={fetchRecipes}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          <span>Refresh Recipes</span>
        </button>
      </div>

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Proven Growth Pipelines</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Pre-Built Automation Recipes
        </h1>
        <p className="text-slate-400 text-sm mt-1 max-w-2xl">
          Instantly deploy autonomous end-to-end publishing pipelines with built-in connector discovery,
          brand voice synthesis, and client sign-off gates.
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[#0d111b]/80 border border-white/5 rounded-2xl p-7 animate-pulse space-y-5"
            >
              <div className="h-6 w-32 bg-white/10 rounded" />
              <div className="h-4 w-4/5 bg-white/5 rounded" />
              <div className="h-20 bg-white/5 rounded-xl" />
              <div className="h-8 w-28 bg-white/10 rounded ml-auto" />
            </div>
          ))}
        </div>
      )}

      {/* Recipe Cards Grid */}
      {!loading && recipes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recipes.map((recipe) => {
            const isFlagship = recipe.id === 'flagship-product-promotion';
            const Icon = getRecipeIcon(recipe);
            const iconColor = getRecipeColor(recipe);
            const actions = recipe.defaultActions || [];
            const connectors = recipe.requiredConnectors || [];

            return (
              <div
                key={recipe.id}
                className={`bg-[#0d111b]/90 border rounded-2xl p-6 md:p-7 backdrop-blur-xl shadow-xl flex flex-col justify-between transition-all duration-200 hover:shadow-2xl space-y-6 ${
                  isFlagship
                    ? 'border-purple-500/50 ring-1 ring-purple-500/30 hover:border-purple-500/80 hover:shadow-purple-900/20'
                    : 'border-white/10 hover:border-purple-500/40 hover:shadow-purple-500/10'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold">
                      <Icon className="w-4 h-4" style={{ color: iconColor }} />
                      <span className="text-white">
                        {recipe.defaultTrigger?.type === 'datasource_change'
                          ? 'Data Sync Trigger'
                          : recipe.defaultTrigger?.type || 'Trigger'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isFlagship && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Flagship Workflow</span>
                        </span>
                      )}
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                        {recipe.category}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {recipe.title}
                    </h3>
                    <p className="text-slate-400 text-xs md:text-sm mt-2 leading-relaxed">
                      {recipe.description}
                    </p>
                  </div>

                  {/* Required Connectors */}
                  {connectors.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>Connectors:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {connectors.map((c: string) => (
                          <span
                            key={c}
                            className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] font-medium text-slate-200 capitalize"
                          >
                            {c.replace('-', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Pipeline Steps */}
                  <div className="p-4 rounded-xl bg-[#131926]/70 border border-white/5 space-y-2">
                    <p className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                      Action Pipeline ({actions.length} Steps)
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {actions.map((step: any, idx: number) => (
                        <React.Fragment key={step.id || idx}>
                          <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5 text-[11px]">
                            {step.name || step.type}
                          </span>
                          {idx < actions.length - 1 && (
                            <span className="text-slate-600">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    Human sign-off gate: <strong className="text-slate-300">Enforced by Default</strong>
                  </span>

                  <button
                    onClick={() => handleDeployRecipe(recipe)}
                    disabled={deployingId === recipe.id}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 rounded-xl shadow-md transition transform hover:-translate-y-0.5"
                  >
                    <Zap
                      className={`w-3.5 h-3.5 ${
                        deployingId === recipe.id ? 'animate-spin' : ''
                      }`}
                    />
                    <span>{deployingId === recipe.id ? 'Deploying...' : 'Deploy Recipe'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AutomationTemplates;
