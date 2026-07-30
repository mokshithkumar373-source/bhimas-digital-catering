# Bhimas Orders

BHIMAS CATERING MANAGEMENT SYSTEM (FULL PROJECT SPECIFICATION)

Project Name

Bhimas Catering Management System

Goal

Build a complete Catering Order Management System for Bhimas Catering.

This application must help the owner

 Create Orders

 Calculate Prices

 Generate Professional PDF

 Generate PNG

 Share through WhatsApp

 Manage Customers

 Track Daily Orders

 View Dashboard Analytics

 Print Order Forms

The design should be clean, modern, very fast and mobile friendly.

IMPORTANT

The Catering Order Sheet UI MUST MATCH the uploaded Bhimas Catering paper exactly.

Do NOT redesign it.

Keep the same sections.

Keep the same layout.

Keep the same Telugu headings.

Keep the same borders.

Only digitize it.

Pixel Perfect Layout.

HOME SCREEN

When application opens

DO NOT open login page.

Open Dashboard directly.

Dashboard contains:

✅ New Order

✅ Today's Orders

✅ Pending Orders

✅ Completed Orders

✅ Customers

✅ Reports

✅ Settings

DASHBOARD CARDS

Show

Today's Revenue

Weekly Revenue

Monthly Revenue

Today's Orders

Pending Orders

Completed Orders

Average Order Value

Total Customers

Repeat Customers

Upcoming Functions

CHARTS

Daily Revenue Chart

Monthly Revenue Chart

Weekly Orders

Top Selling Items

Most Ordered Curry

Most Ordered Sweet

NEW ORDER PAGE

This should open immediately after clicking New Order.

The order sheet must look exactly like Bhimas Catering paper.

TOP ACTION BAR

Always fixed on top.

Buttons:

Save

Preview

Generate PDF

Generate PNG

Print

Share PDF

Share PNG

WhatsApp Share

Duplicate Order

Delete Order

CUSTOMER DETAILS

Customer Name

Phone Number

Address

Function Name

Function Date

Delivery Time

Guest Count

Plate Rate

Advance Amount

Balance Amount

Remarks

AUTO CALCULATION

Example

150 Plates

₹150 per Plate

Automatically calculate

150 × 150

= ₹22,500

Less Advance

Balance

GST (optional)

Delivery Charges

Discount

Grand Total

Everything should calculate automatically.

AUTO ITEM LIBRARY

Create a master menu database.

Owner can simply click items.

Categories

Breakfast

Idly

Vada

Puri

Dosa

Upma

Pongal

Poori Curry

Rice

White Rice

Veg Biryani

Pulihora

Jeera Rice

Fried Rice

Bagara Rice

Curries

Paneer Butter Masala

Paneer Curry

Brinjal Curry

Aloo Curry

Mixed Veg Curry

Capsicum Curry

Mushroom Curry

Dal Fry

Sambar

Rasam

Sweets

Rasgulla

Gulab Jamun

Kaju Sweet

Pootharekulu

Boondi Laddu

Double Ka Meetha

Kesari

Badusha

Mysore Pak

Snacks

Mirchi Bajji

Veg Cutlet

Pakodi

Samosa

Punugulu

Ice Cream

Vanilla

Chocolate

Strawberry

Butterscotch

Kulfi

Drinks

Water Bottle

Cool Drinks

Badam Milk

Tea

Coffee

Fruit Juice

ITEM ENTRY

Owner selects category.

Click item.

Automatically added.

Owner can

Increase Quantity

Decrease Quantity

Delete Item

Reorder Items

PDF

Professional PDF.

A4 Portrait.

Exactly same layout as Bhimas Catering paper.

No words cut.

No overlapping.

No missing borders.

Perfect printing.

PNG

Generate High Resolution PNG.

300 DPI.

Print Ready.

SHARE

WhatsApp Share

Share PDF

Share PNG

Download

Print

ORDER STATUS

Pending

Preparing

Ready

Delivered

Cancelled

Completed

CUSTOMER HISTORY

Every customer should have

Previous Orders

Total Orders

Lifetime Revenue

Favorite Menu

Average Plate Count

SEARCH

Search by

Customer Name

Phone Number

Function Date

Order Number

REPORTS

Daily Report

Weekly Report

Monthly Report

Yearly Report

Revenue

Expenses

Profit

Top Customers

Top Menu Items

SETTINGS

Business Name

Logo

Address

Phone

GST Number

Footer

Terms & Conditions

ADMIN FEATURES

Add Items

Edit Items

Delete Items

Change Rates

Category Management

Backup Database

Restore Backup

Export Excel

Import Excel

DATABASE

Use Supabase.

Tables

Customers

Orders

OrderItems

MenuItems

Categories

Payments

Expenses

Settings

DashboardStats

REAL-TIME

Every saved order must instantly update:

Dashboard

Revenue

Today's Orders

Reports

Customer History

without refreshing.

PERFORMANCE

Very Fast

Mobile Responsive

Desktop Responsive

Tablet Responsive

No Lag

No UI Freezing

No Data Loss

UI STYLE

Clean Professional Interface

White Background

Green Theme (matching Bhimas Catering)

Rounded Buttons

Soft Shadows

Modern Typography

Minimal Design

FINAL REQUIREMENTS

 Pixel-perfect recreation of the uploaded Bhimas Catering paper.

 Dashboard opens first.

 One-click New Order.

 Automatic calculations.

 Master menu with auto item selection.

 Professional PDF and PNG generation with no layout issues.

 WhatsApp sharing.

 Daily, Weekly, Monthly revenue analytics.

 Supabase-powered real-time database.

 Fully responsive for mobile and desktop.

 Production-ready quality with clean, maintainable code and no placeholder features.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://bhimas-digital-catering.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6e1bb42f-3e76-472d-9fd2-e4c6bbaac139).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
