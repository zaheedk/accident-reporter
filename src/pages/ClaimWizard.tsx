import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClaimReport, ThirdPartyVehicle, Witness, WEATHER_OPTIONS, ROAD_OPTIONS } from '@/types';
import { getVehicles, getClaims, saveClaim, generateId } from '@/lib/storage';
import AppLayout from '@/components/AppLayout';

const STEPS = ['Incident Details', 'Your Vehicle', 'Third Parties', 'Witnesses & Police', 'Conditions & Damage', 'Review'];

const stepVariants = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -10 },
};

const emptyThirdParty: ThirdPartyVehicle = {
  ownerName: '', phone: '', address: '', insurer: '', make: '', model: '', regoNumber: '', damageDescription: '',
};

const emptyWitness: Witness = {
  name: '', phone: '', address: '', isPassenger: false,
};

function emptyClaim(): ClaimReport {
  return {
    id: generateId(),
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    incidentDate: '', incidentTime: '', incidentLocation: '', vehicleUsage: '', journeyDetails: '', description: '',
    vehicleId: '', speedBeforeBraking: '',
    thirdParties: [],
    otherPropertyDamage: '', otherPropertyOwner: '',
    witnesses: [],
    policeAttended: false, policeOfficerDetails: '',
    anyoneHurt: false, injuryDetails: '',
    weatherCondition: '', roadCondition: '',
    driverConsumedSubstance: false, substanceDetails: '',
    blameDescription: '', liabilityAdmitted: false, liabilityDetails: '',
    damageDescription: '', vehicleTowed: false, towingCompany: '',
    repairerName: '', repairerPhone: '', repairerAddress: '',
  };
}

export default function ClaimWizard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [claim, setClaim] = useState<ClaimReport>(emptyClaim);
  const vehicles = getVehicles();

  useEffect(() => {
    if (id) {
      const existing = getClaims().find(c => c.id === id);
      if (existing) setClaim(existing);
    }
  }, [id]);

  const update = (field: keyof ClaimReport, value: any) => {
    setClaim(prev => ({ ...prev, [field]: value, updatedAt: new Date().toISOString() }));
  };

  const autoSave = () => {
    saveClaim({ ...claim, updatedAt: new Date().toISOString() });
  };

  const next = () => { autoSave(); setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const prev = () => { autoSave(); setStep(s => Math.max(s - 1, 0)); };

  const submit = () => {
    const finalClaim = { ...claim, status: 'submitted' as const, updatedAt: new Date().toISOString() };
    saveClaim(finalClaim);
    navigate('/claims');
  };

  const addThirdParty = () => update('thirdParties', [...claim.thirdParties, { ...emptyThirdParty }]);
  const updateThirdParty = (i: number, field: string, value: string) => {
    const updated = [...claim.thirdParties];
    (updated[i] as any)[field] = value;
    update('thirdParties', updated);
  };
  const removeThirdParty = (i: number) => update('thirdParties', claim.thirdParties.filter((_, idx) => idx !== i));

  const addWitness = () => update('witnesses', [...claim.witnesses, { ...emptyWitness }]);
  const updateWitness = (i: number, field: string, value: string | boolean) => {
    const updated = [...claim.witnesses];
    (updated[i] as any)[field] = value;
    update('witnesses', updated);
  };
  const removeWitness = (i: number) => update('witnesses', claim.witnesses.filter((_, idx) => idx !== i));

  const selectedVehicle = vehicles.find(v => v.id === claim.vehicleId);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => { autoSave(); navigate(-1); }} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="section-title">Report an Incident</h1>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Save className="w-3 h-3" /> Auto-saved as draft
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < step ? 'bg-primary' : i === step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="step-badge step-badge-active tabular-nums">{step + 1}</span>
          <span className="text-sm font-medium text-foreground">{STEPS[step]}</span>
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ ease: [0.25, 0.1, 0.25, 1], duration: 0.3 }}
          >
            {step === 0 && (
              <div className="card-surface space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Date of Incident</label>
                    <input type="date" className="form-input tabular-nums" value={claim.incidentDate} onChange={e => update('incidentDate', e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Time</label>
                    <input type="time" className="form-input tabular-nums" value={claim.incidentTime} onChange={e => update('incidentTime', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Location (street and town)</label>
                  <input className="form-input" placeholder="e.g. 42 Queen St, Auckland CBD" value={claim.incidentLocation} onChange={e => update('incidentLocation', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">What was the vehicle being used for?</label>
                  <input className="form-input" placeholder="e.g. Personal use, commuting to work" value={claim.vehicleUsage} onChange={e => update('vehicleUsage', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Details of your journey</label>
                  <textarea className="form-input min-h-[80px] resize-none" placeholder="Describe where you were going and the route taken" value={claim.journeyDetails} onChange={e => update('journeyDetails', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">What happened?</label>
                  <textarea className="form-input min-h-[100px] resize-none" placeholder="Provide full details of the incident" value={claim.description} onChange={e => update('description', e.target.value)} />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="card-surface space-y-4">
                <div>
                  <label className="form-label">Select Your Vehicle</label>
                  {vehicles.length === 0 ? (
                    <div className="p-4 rounded-lg bg-accent text-center">
                      <p className="text-sm text-muted-foreground">No vehicles in your garage.</p>
                      <button onClick={() => { autoSave(); navigate('/vehicles/new'); }} className="text-sm text-primary font-medium mt-2 hover:underline">
                        Add a vehicle first
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {vehicles.map(v => (
                        <button
                          key={v.id}
                          onClick={() => update('vehicleId', v.id)}
                          className={`w-full text-left p-3 rounded-lg transition-all ${
                            claim.vehicleId === v.id
                              ? 'bg-primary/10 ring-2 ring-primary/20'
                              : 'bg-accent hover:bg-muted'
                          }`}
                        >
                          <div className="text-sm font-medium text-foreground">{v.year} {v.make} {v.model}</div>
                          <div className="text-xs text-muted-foreground tabular-nums">{v.regoNumber}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="form-label">Speed before braking (km/h)</label>
                  <input className="form-input tabular-nums" placeholder="e.g. 50" value={claim.speedBeforeBraking} onChange={e => update('speedBeforeBraking', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Describe damage to your vehicle</label>
                  <textarea className="form-input min-h-[80px] resize-none" placeholder="Describe all visible damage" value={claim.damageDescription} onChange={e => update('damageDescription', e.target.value)} />
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => update('vehicleTowed', !claim.vehicleTowed)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${claim.vehicleTowed ? 'bg-primary' : 'bg-muted'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-card transition-transform ${claim.vehicleTowed ? 'left-[18px]' : 'left-0.5'}`} style={{ boxShadow: 'var(--shadow-sm)' }} />
                  </button>
                  <span className="text-sm text-foreground">Vehicle needed towing</span>
                </div>
                {claim.vehicleTowed && (
                  <div>
                    <label className="form-label">Towing Company</label>
                    <input className="form-input" value={claim.towingCompany} onChange={e => update('towingCompany', e.target.value)} />
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="card-surface space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="form-label mb-0">Other Vehicles Involved</label>
                    <button onClick={addThirdParty} className="text-xs text-primary font-medium hover:underline">+ Add Vehicle</button>
                  </div>
                  {claim.thirdParties.length === 0 && (
                    <p className="text-sm text-muted-foreground">No third-party vehicles added.</p>
                  )}
                  {claim.thirdParties.map((tp, i) => (
                    <div key={i} className="p-4 rounded-lg bg-accent space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Vehicle {i + 1}</span>
                        <button onClick={() => removeThirdParty(i)} className="text-xs text-destructive hover:underline">Remove</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="form-label">Owner / Driver</label>
                          <input className="form-input" value={tp.ownerName} onChange={e => updateThirdParty(i, 'ownerName', e.target.value)} />
                        </div>
                        <div>
                          <label className="form-label">Phone</label>
                          <input className="form-input" value={tp.phone} onChange={e => updateThirdParty(i, 'phone', e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Address</label>
                        <input className="form-input" value={tp.address} onChange={e => updateThirdParty(i, 'address', e.target.value)} />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="form-label">Make</label>
                          <input className="form-input" value={tp.make} onChange={e => updateThirdParty(i, 'make', e.target.value)} />
                        </div>
                        <div>
                          <label className="form-label">Model</label>
                          <input className="form-input" value={tp.model} onChange={e => updateThirdParty(i, 'model', e.target.value)} />
                        </div>
                        <div>
                          <label className="form-label">Rego No.</label>
                          <input className="form-input tabular-nums" value={tp.regoNumber} onChange={e => updateThirdParty(i, 'regoNumber', e.target.value.toUpperCase())} />
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Insurer</label>
                        <input className="form-input" value={tp.insurer} onChange={e => updateThirdParty(i, 'insurer', e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label">Damage Description</label>
                        <textarea className="form-input min-h-[60px] resize-none" value={tp.damageDescription} onChange={e => updateThirdParty(i, 'damageDescription', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card-surface space-y-3">
                  <label className="form-label">Other Property Damaged</label>
                  <input className="form-input" placeholder="Owner name and address" value={claim.otherPropertyOwner} onChange={e => update('otherPropertyOwner', e.target.value)} />
                  <textarea className="form-input min-h-[60px] resize-none" placeholder="Describe damage to other property" value={claim.otherPropertyDamage} onChange={e => update('otherPropertyDamage', e.target.value)} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="card-surface space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="form-label mb-0">Witnesses</label>
                    <button onClick={addWitness} className="text-xs text-primary font-medium hover:underline">+ Add Witness</button>
                  </div>
                  {claim.witnesses.length === 0 && (
                    <p className="text-sm text-muted-foreground">No witnesses added.</p>
                  )}
                  {claim.witnesses.map((w, i) => (
                    <div key={i} className="p-4 rounded-lg bg-accent space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Witness {i + 1}</span>
                        <button onClick={() => removeWitness(i)} className="text-xs text-destructive hover:underline">Remove</button>
                      </div>
                      <div>
                        <label className="form-label">Full Name</label>
                        <input className="form-input" value={w.name} onChange={e => updateWitness(i, 'name', e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="form-label">Phone</label>
                          <input className="form-input" value={w.phone} onChange={e => updateWitness(i, 'phone', e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2 pt-5">
                          <button type="button" onClick={() => updateWitness(i, 'isPassenger', !w.isPassenger)}
                            className={`w-10 h-6 rounded-full transition-colors relative ${w.isPassenger ? 'bg-primary' : 'bg-muted'}`}>
                            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-card transition-transform ${w.isPassenger ? 'left-[18px]' : 'left-0.5'}`} style={{ boxShadow: 'var(--shadow-sm)' }} />
                          </button>
                          <span className="text-xs text-foreground">Passenger</span>
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Address</label>
                        <input className="form-input" value={w.address} onChange={e => updateWitness(i, 'address', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card-surface space-y-3">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => update('policeAttended', !claim.policeAttended)}
                      className={`w-10 h-6 rounded-full transition-colors relative ${claim.policeAttended ? 'bg-primary' : 'bg-muted'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-card transition-transform ${claim.policeAttended ? 'left-[18px]' : 'left-0.5'}`} style={{ boxShadow: 'var(--shadow-sm)' }} />
                    </button>
                    <span className="text-sm text-foreground">Police attended the accident</span>
                  </div>
                  {claim.policeAttended && (
                    <div>
                      <label className="form-label">Officer's name and number</label>
                      <input className="form-input" value={claim.policeOfficerDetails} onChange={e => update('policeOfficerDetails', e.target.value)} />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => update('anyoneHurt', !claim.anyoneHurt)}
                      className={`w-10 h-6 rounded-full transition-colors relative ${claim.anyoneHurt ? 'bg-primary' : 'bg-muted'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-card transition-transform ${claim.anyoneHurt ? 'left-[18px]' : 'left-0.5'}`} style={{ boxShadow: 'var(--shadow-sm)' }} />
                    </button>
                    <span className="text-sm text-foreground">Anyone injured in the accident</span>
                  </div>
                  {claim.anyoneHurt && (
                    <div>
                      <label className="form-label">Injury Details</label>
                      <textarea className="form-input min-h-[60px] resize-none" placeholder="Who was hurt, relationship to driver, extent of injuries" value={claim.injuryDetails} onChange={e => update('injuryDetails', e.target.value)} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="card-surface space-y-4">
                  <div>
                    <label className="form-label">Weather Conditions</label>
                    <div className="flex flex-wrap gap-2">
                      {WEATHER_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => update('weatherCondition', opt.value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            claim.weatherCondition === opt.value
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-accent text-accent-foreground hover:bg-muted'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Road Conditions</label>
                    <div className="flex flex-wrap gap-2">
                      {ROAD_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => update('roadCondition', opt.value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            claim.roadCondition === opt.value
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-accent text-accent-foreground hover:bg-muted'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="card-surface space-y-3">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => update('driverConsumedSubstance', !claim.driverConsumedSubstance)}
                      className={`w-10 h-6 rounded-full transition-colors relative ${claim.driverConsumedSubstance ? 'bg-destructive' : 'bg-muted'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-card transition-transform ${claim.driverConsumedSubstance ? 'left-[18px]' : 'left-0.5'}`} style={{ boxShadow: 'var(--shadow-sm)' }} />
                    </button>
                    <span className="text-sm text-foreground">Driver consumed alcohol/drugs in 12 hours before</span>
                  </div>
                  {claim.driverConsumedSubstance && (
                    <div>
                      <label className="form-label">Substance Details</label>
                      <input className="form-input" placeholder="What, how much, when" value={claim.substanceDetails} onChange={e => update('substanceDetails', e.target.value)} />
                    </div>
                  )}
                </div>

                <div className="card-surface space-y-3">
                  <div>
                    <label className="form-label">Who do you consider to be at fault?</label>
                    <textarea className="form-input min-h-[60px] resize-none" placeholder="Describe who is at fault and why" value={claim.blameDescription} onChange={e => update('blameDescription', e.target.value)} />
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => update('liabilityAdmitted', !claim.liabilityAdmitted)}
                      className={`w-10 h-6 rounded-full transition-colors relative ${claim.liabilityAdmitted ? 'bg-primary' : 'bg-muted'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-card transition-transform ${claim.liabilityAdmitted ? 'left-[18px]' : 'left-0.5'}`} style={{ boxShadow: 'var(--shadow-sm)' }} />
                    </button>
                    <span className="text-sm text-foreground">Anyone admitted liability</span>
                  </div>
                  {claim.liabilityAdmitted && (
                    <div>
                      <label className="form-label">Who admitted liability?</label>
                      <input className="form-input" value={claim.liabilityDetails} onChange={e => update('liabilityDetails', e.target.value)} />
                    </div>
                  )}
                </div>

                <div className="card-surface space-y-3">
                  <label className="form-label">Repairer Details</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">Name</label>
                      <input className="form-input" value={claim.repairerName} onChange={e => update('repairerName', e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Phone</label>
                      <input className="form-input" value={claim.repairerPhone} onChange={e => update('repairerPhone', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Address</label>
                    <input className="form-input" value={claim.repairerAddress} onChange={e => update('repairerAddress', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="card-surface space-y-3">
                  <h3 className="section-title text-base">Incident</h3>
                  <ReviewRow label="Date" value={claim.incidentDate} />
                  <ReviewRow label="Time" value={claim.incidentTime} />
                  <ReviewRow label="Location" value={claim.incidentLocation} />
                  <ReviewRow label="Description" value={claim.description} />
                </div>
                <div className="card-surface space-y-3">
                  <h3 className="section-title text-base">Your Vehicle</h3>
                  <ReviewRow label="Vehicle" value={selectedVehicle ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}` : '—'} />
                  <ReviewRow label="Rego" value={selectedVehicle?.regoNumber || '—'} />
                  <ReviewRow label="Damage" value={claim.damageDescription} />
                </div>
                <div className="card-surface space-y-3">
                  <h3 className="section-title text-base">Third Parties</h3>
                  {claim.thirdParties.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None</p>
                  ) : claim.thirdParties.map((tp, i) => (
                    <div key={i} className="p-3 rounded-lg bg-accent">
                      <ReviewRow label="Owner" value={tp.ownerName} />
                      <ReviewRow label="Vehicle" value={`${tp.make} ${tp.model} – ${tp.regoNumber}`} />
                    </div>
                  ))}
                </div>
                <div className="card-surface space-y-3">
                  <h3 className="section-title text-base">Witnesses</h3>
                  {claim.witnesses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None</p>
                  ) : claim.witnesses.map((w, i) => (
                    <ReviewRow key={i} label={`Witness ${i + 1}`} value={`${w.name} – ${w.phone}`} />
                  ))}
                  <ReviewRow label="Police Attended" value={claim.policeAttended ? 'Yes' : 'No'} />
                </div>
                <div className="card-surface space-y-3">
                  <h3 className="section-title text-base">Conditions</h3>
                  <ReviewRow label="Weather" value={claim.weatherCondition || '—'} />
                  <ReviewRow label="Road" value={claim.roadCondition || '—'} />
                  <ReviewRow label="At Fault" value={claim.blameDescription || '—'} />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3 pb-16 md:pb-0">
          {step > 0 && (
            <button onClick={prev} className="flex-1 h-12 rounded-lg bg-accent text-accent-foreground font-medium text-sm flex items-center justify-center gap-2 transition-all hover:bg-muted active:scale-[0.98]">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={next} className="flex-1 h-12 rounded-lg bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]" style={{ boxShadow: 'var(--shadow-md)' }}>
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={submit} className="flex-1 h-12 rounded-lg bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]" style={{ boxShadow: 'var(--shadow-md)' }}>
              <Check className="w-4 h-4" /> Submit Report
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-sm text-foreground text-right">{value || '—'}</span>
    </div>
  );
}
