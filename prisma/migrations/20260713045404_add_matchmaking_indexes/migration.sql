-- CreateIndex
CREATE INDEX "Profile_gender_dateOfBirth_idx" ON "Profile"("gender", "dateOfBirth");

-- CreateIndex
CREATE INDEX "Profile_gender_district_idx" ON "Profile"("gender", "district");
