# Meal Planner AU (Frontend)

Vite + React + Tailwind. Points at your AWS API Gateway custom domain.

## Quick start
```bash
npm ci
echo "VITE_API_BASE_URL=https://api.meal.lcfr.xyz" > .env.local
npm run dev   # http://localhost:5173
npm run build # outputs dist/
```

## Deploy to AWS S3/CloudFront
```bash
aws s3 sync dist/ s3://<your-bucket>/ --delete
aws cloudfront create-invalidation --distribution-id <CF_DISTRIBUTION_ID> --paths "/*"
```

Set your bucket and distribution IDs using Terraform outputs.
