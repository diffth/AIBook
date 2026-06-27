import csv
import random
from datetime import datetime, timedelta

def generate_superstore_sample(filename="Sample-100-superstore.csv"):
    categories = {
        "Technology": ["Phones", "Accessories", "Copiers", "Machines"],
        "Furniture": ["Chairs", "Tables", "Bookcases", "Furnishings"],
        "Office Supplies": ["Paper", "Binders", "Art", "Appliances", "Envelopes", "Labels", "Fasteners"]
    }
    
    product_prefixes = {
        "Phones": "iPhone", "Accessories": "Logitech Mouse", "Copiers": "Canon Copier", "Machines": "Epson Printer",
        "Chairs": "Office Chair", "Tables": "Conference Table", "Bookcases": "Wooden Bookcase", "Furnishings": "Desk Lamp",
        "Paper": "Premium A4 Paper", "Binders": "Ring Binder", "Art": "Color Markers", "Appliances": "Mini Fridge",
        "Envelopes": "Kraft Envelopes", "Labels": "Address Labels", "Fasteners": "Paper Clips"
    }

    start_date = datetime(2026, 1, 1)
    
    headers = ["Row ID", "Order ID", "Order Date", "Category", "Sub-Category", "Product Name", "Sales", "Quantity", "Discount", "Profit"]
    
    rows = []
    for i in range(1, 101):
        row_id = i
        order_year = 2026
        order_num = 100000 + i
        order_id = f"CA-{order_year}-{order_num}"
        
        # 무작위 날짜 생성
        days_to_add = random.randint(0, 170)  # 1월 1일 ~ 6월 중순
        order_date = (start_date + timedelta(days=days_to_add)).strftime("%Y-%m-%d")
        
        category = random.choice(list(categories.keys()))
        sub_category = random.choice(categories[category])
        
        product_base = product_prefixes[sub_category]
        product_name = f"{product_base} Model-{random.choice(['X', 'Y', 'Z', 'Pro', 'Lite'])}"
        
        # Sales 생성
        if category == "Technology":
            sales = round(random.uniform(100.0, 1500.0), 2)
        elif category == "Furniture":
            sales = round(random.uniform(80.0, 1000.0), 2)
        else:  # Office Supplies
            sales = round(random.uniform(5.0, 200.0), 2)
            
        quantity = random.randint(1, 10)
        
        # 할인율 (0, 0.1, 0.2, 0.3, 0.4 중 무작위)
        discount = random.choice([0.0, 0.1, 0.2, 0.15, 0.3, 0.4])
        
        # 수익 계산 (할인율이 높으면 적자가 날 수 있음)
        # 기본 마진 15%~40%
        base_margin = random.uniform(0.15, 0.40)
        cost = sales * (1 - base_margin)
        actual_sales = sales * (1 - discount)
        profit = round((actual_sales - cost) * quantity, 2)
        
        # 정렬된 매출액 적용
        sales = round(actual_sales * quantity, 2)
        
        rows.append([row_id, order_id, order_date, category, sub_category, product_name, sales, quantity, discount, profit])
        
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)
        
    print(f"Successfully generated {filename} with 100 rows.")

if __name__ == "__main__":
    generate_superstore_sample()
