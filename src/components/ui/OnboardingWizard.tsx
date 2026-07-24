import { useState } from 'react';
import { Truck, Users, Building2, Route, Check, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { getPathForModule } from '../../router/routes';

const steps = [
  {
    id: 'welcome',
    icon: Truck,
    title: 'Welcome to Garud AI',
    description: 'Let\'s set up your transport business in 5 quick steps.',
    action: 'Get Started',
  },
  {
    id: 'company',
    icon: Building2,
    title: 'Company Details',
    description: 'Your company name, GSTIN, and address are already configured. You can update them anytime in Settings.',
    action: 'Next',
  },
  {
    id: 'vehicles',
    icon: Truck,
    title: 'Add Your Vehicles',
    description: 'Go to Fleet module to add vehicles one by one, or use Bulk Upload to import from CSV.',
    action: 'Next',
  },
  {
    id: 'drivers',
    icon: Users,
    title: 'Add Your Drivers',
    description: 'Add drivers with their license details, salary info, and assign them to vehicles.',
    action: 'Next',
  },
  {
    id: 'customers',
    icon: Building2,
    title: 'Add Your Customers',
    description: 'Add your regular customers with GSTIN, credit limit, and contract rates.',
    action: 'Next',
  },
  {
    id: 'done',
    icon: Route,
    title: 'You\'re All Set!',
    description: 'Start by creating your first trip. Go to Operations \u2192 Trips \u2192 New Trip.',
    action: 'Start Using Garud AI',
  },
];

export default function OnboardingWizard() {
  const { setActiveModule } = useStore();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('garud_onboarding_done') === 'true';
  });

  if (dismissed) return null;

  const step = steps[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleDismiss = () => {
    localStorage.setItem('garud_onboarding_done', 'true');
    setDismissed(true);
  };

  const handleNext = () => {
    if (isLast) {
      handleDismiss();
      setActiveModule('trips');
      navigate(getPathForModule('trips'));
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            {isLast ? (
              <Check className="w-8 h-8 text-white" />
            ) : (
              <Icon className="w-8 h-8 text-white" />
            )}
          </div>

          {/* Step indicator */}
          <p className="text-xs font-medium text-indigo-600 mb-2">
            Step {currentStep + 1} of {steps.length}
          </p>

          {/* Title */}
          <h2 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h2>

          {/* Description */}
          <p className="text-sm text-slate-500 leading-relaxed mb-8">{step.description}</p>

          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentStep ? 'w-6 bg-indigo-600' : idx < currentStep ? 'bg-indigo-300' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Action */}
          <button
            onClick={handleNext}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all"
          >
            {step.action}
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Skip */}
          {!isLast && (
            <button
              onClick={handleDismiss}
              className="mt-4 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Skip onboarding
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
