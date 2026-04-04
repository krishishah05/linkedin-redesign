@echo off
echo Running frontend tests...
npx jest --watchAll=false > output.txt 2>&1
echo Done. Results saved to output-frontend-file-1.txt
 