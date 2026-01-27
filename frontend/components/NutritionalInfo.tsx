import React from "react";

interface NutritionalInfoProps {
  nutritionalInfo?: {
    energy?: string;
    protein?: string;
    total_fat?: string;
    saturated_fat?: string;
    trans_fat?: string;
    cholesterol?: string;
    carbohydrates?: string;
    total_sugars?: string;
    dietary_fibre?: string;
    sodium?: string;
  };
}

const NutritionalInfo: React.FC<NutritionalInfoProps> = ({ nutritionalInfo }) => {
  if (!nutritionalInfo) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Nutritional Information (per 100g)
        </h2>
        <p className="text-sm text-gray-500">No nutritional information available</p>
      </div>
    );
  }

  const nutritionalItems = [
    { label: "Energy", value: nutritionalInfo.energy },
    { label: "Protein", value: nutritionalInfo.protein },
    { label: "Total Fat", value: nutritionalInfo.total_fat },
    { label: "- Saturated Fat", value: nutritionalInfo.saturated_fat, isSubItem: true },
    { label: "- Trans Fat", value: nutritionalInfo.trans_fat, isSubItem: true },
    { label: "Cholesterol", value: nutritionalInfo.cholesterol },
    { label: "Carbohydrates", value: nutritionalInfo.carbohydrates },
    { label: "Total Sugars", value: nutritionalInfo.total_sugars },
    { label: "Dietary Fibre", value: nutritionalInfo.dietary_fibre },
    { label: "Sodium", value: nutritionalInfo.sodium }
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Nutritional Information (per 100g)
      </h2>
      
      <div className="space-y-3">
        {nutritionalItems.map((item, index) => (
          item.value && (
            <div 
              key={index} 
              className={`flex justify-between items-center py-2 ${
                index !== nutritionalItems.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <dt className={`text-sm ${
                item.isSubItem 
                  ? 'text-gray-600 ml-4' 
                  : 'text-gray-900 font-medium'
              }`}>
                {item.label}
              </dt>
              <dd className="text-sm text-gray-900 font-medium">
                {item.value}
              </dd>
            </div>
          )
        ))}
      </div>

      {/* Page dots indicator like in Figma */}
      <div className="flex justify-center mt-6 space-x-2">
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
        <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
      </div>
    </div>
  );
};

export default NutritionalInfo;