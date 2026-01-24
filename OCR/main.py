import asyncio
import os
import glob
import json
from agent import NutritionWorkflow

async def main():
    # 1. Setup paths
    folder_path = "tmp_images"
    
    # Check if folder exists
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)
        print(f"📁 Created folder '{folder_path}'. Please put images inside!")
        return

    # 2. Find all images (jpg, jpeg, png)
    # FIXED:  Removed extra spaces in extensions
    image_files = []
    for ext in ['*.jpg', '*. jpeg', '*.png', '*. JPG', '*.JPEG', '*.PNG']:
        image_files.extend(glob. glob(os.path.join(folder_path, ext)))

    # Sort them so they process in order
    image_files. sort()

    if not image_files:
        print(f"❌ No images found in '{folder_path}'")
        print("Please add some . jpg or .png files and run again.")
        return

    print(f"🚀 Found {len(image_files)} images. Starting Batch Job...")
    print("="*60)

    # 3. Initialize Agent ONCE (Reuse it for speed)
    workflow = NutritionWorkflow(timeout=200, verbose=False)

    # 4. Loop through every image
    for index, image_path in enumerate(image_files):
        filename = os.path.basename(image_path)
        print(f"\nProcessing [{index+1}/{len(image_files)}]: {filename} ...")
        
        try:
            # Run the pipeline
            result = await workflow. run(image_path=image_path)

            if "error" in result:
                print(f"⚠️  Skipped {filename}:  {result['error']}")
            else:
                # SUCCESS OUTPUT
                print(f"\n✅ Success!  Extracted Data:")
                print(f"   Product: {result['supplement_name']}")
                print(f"   Brand:   {result['supplement_brand']}")
                print(f"   Serving:  {result['serving_size_text']} ({result['serving_size_grams']}g)")
                
                # --- PER SERVING ---
                print("\n   " + "="*50)
                print("   📗 NUTRITION PER SERVING:")
                print("   " + "="*50)
                print(json. dumps(result['nutritional_info_per_serving'], indent=4))
                
                # --- PER 100G ---
                print("\n   " + "="*50)
                if result. get('per_100g_calculated'):
                    print("   📙 NUTRITION PER 100G (CALCULATED):")
                else:
                    print("   📙 NUTRITION PER 100G (FROM LABEL):")
                print("   " + "="*50)
                if result['nutritional_info_per_100g']:
                    print(json. dumps(result['nutritional_info_per_100g'], indent=4))
                else:
                    print("   ⚠️ Not available")
                
                # --- INGREDIENTS ---
                print("\n   " + "="*50)
                print("   🧪 INGREDIENTS:")
                print("   " + "="*50)
                print(json.dumps(result['supplement_ingredient'], indent=4))
                
                # --- VECTORS ---
                print("\n   " + "="*50)
                print("   🔢 VECTOR EMBEDDINGS:")
                print("   " + "="*50)
                print(f"   Vector (Per Serving): [{result['vector_per_serving'][0]:.6f}, {result['vector_per_serving'][1]:.6f}, {result['vector_per_serving'][2]:.6f}, ...]")
                if result['vector_per_100g']: 
                    print(f"   Vector (Per 100g):    [{result['vector_per_100g'][0]:.6f}, {result['vector_per_100g'][1]:.6f}, {result['vector_per_100g'][2]:.6f}, ...]")
                else:
                    print("   Vector (Per 100g):    ⚠️ Not available")

        except Exception as e:
            print(f"❌ CRITICAL ERROR on {filename}: {e}")
            import traceback
            traceback.print_exc()

        print("\n" + "-" * 60)

    print("\n🏁 Batch Job Complete.")

if __name__ == "__main__":
    asyncio.run(main())