import React from "react";

interface SupplementInfoProps {
  supplement: {
    supplement_name: string;
    supplement_brand: string;
    supplement_packaging_form: string;
    supplement_status: string;
    batch_testing_org: string | null;
    product_source_url: string[] | string | null;
    description?: string;
    serving_size?: string;
    ingredients?: string;
    notes?: string;
  };
}

const SupplementInfo: React.FC<SupplementInfoProps> = ({ supplement }) => {
  const getSourceUrl = () => {
    if (Array.isArray(supplement.product_source_url)) {
      return supplement.product_source_url[0];
    }
    return supplement.product_source_url;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Supplement Information
      </h2>

      <div className="space-y-4">
        {/* Description */}
        {supplement.description && (
          <div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {supplement.description}
            </p>
          </div>
        )}

        {/* Product Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Form
            </dt>
            <dd className="text-sm text-gray-900">
              {supplement.supplement_packaging_form}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Website
            </dt>
            <dd className="text-sm text-blue-600 hover:text-blue-800">
              <a
                href={`https://${getSourceUrl()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline break-words"
              >
                {getSourceUrl() || "N/A"}
              </a>
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Serving Size
            </dt>
            <dd className="text-sm text-gray-900">
              {supplement.serving_size || "N/A"}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Testing Org
            </dt>
            <dd className="text-sm text-gray-900 break-words">
              {supplement.batch_testing_org || "N/A"}
            </dd>
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Ingredients
          </dt>
          <dd className="text-sm text-gray-900 break-words">
            {supplement.ingredients || "N/A"}
          </dd>
        </div>

        {/* Notes */}
        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Additional Notes
          </dt>
          <dd className="text-sm text-gray-900 break-words">
            {supplement.notes || "N/A"}
          </dd>
        </div>
      </div>
    </div>
  );
};

export default SupplementInfo;
