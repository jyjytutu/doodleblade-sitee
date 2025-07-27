git clone https://github.com/jyjytutu/doodleblade-sitee.git
cd doodleblade-sitee
# If files are in a subfolder, move them up:
mv subfoldername/* .
mv subfoldername/.* .  # careful with hidden files
rmdir subfoldername
git add .
git commit -m "Move files to root for Vercel deploy"
git push origin main
