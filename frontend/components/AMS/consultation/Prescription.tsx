import { useState, useEffect } from "react";

interface PrescriptionProps {
  athleteId: string;
  sessionId: string;
}

interface PrescriptionItem {
  id: string;
  supplement_name: string;
  prescriber: string;
  batch_number: string;
  dosage: number;
  dosage_unit: string;
  dosage_frequency: string;
  prescription_date: string;
  intervention_status: string;
}

export default function Prescription({
  athleteId,
  sessionId,
}: PrescriptionProps) {
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const fetchPrescriptions = async () => {
    if (!sessionId) {
      setPrescriptions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/prescription/session/${sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setPrescriptions(data.data || []);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
      setError("Failed to load prescriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [sessionId]);

  if (loading) {
    return (
      <section id="prescription" className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="prescription" className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchPrescriptions}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="prescription" className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Prescription</h2>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
            Add New Prescription
          </button>
          <button className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200">
            Print All
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {prescriptions.length === 0 ? (
          <div className="text-center py-8">
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No prescriptions
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              No prescriptions have been made for this consultation session.
            </p>
          </div>
        ) : (
          prescriptions.map((prescription, index) => (
            <div
              key={prescription.id}
              className="border-b border-gray-200 pb-6 last:border-b-0"
            >
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Supplement Name:</span>
                  <span className="text-gray-900">
                    {prescription.supplement_name}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Prescriber:</span>
                  <span className="text-gray-900">
                    {prescription.prescriber}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Batch Number:</span>
                  <span className="text-gray-900">
                    {prescription.batch_number}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Dosage:</span>
                  <span className="text-gray-900">
                    {prescription.dosage} {prescription.dosage_unit}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Dosage Frequency:</span>
                  <span className="text-gray-900">
                    {prescription.dosage_frequency}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Prescription Date:</span>
                  <span className="text-gray-900">
                    {new Date(
                      prescription.prescription_date,
                    ).toLocaleDateString()}
                  </span>
                </div>

                {prescription.intervention_status && (
                  <div className="flex justify-between items-center col-span-2">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-gray-900">
                      {prescription.intervention_status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
