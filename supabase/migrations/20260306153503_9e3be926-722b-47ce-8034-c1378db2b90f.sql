-- RLS policies for authorized_persons
CREATE POLICY "Residents can view their own authorized persons" ON public.authorized_persons FOR SELECT USING (resident_id = auth.uid() OR public.is_society_admin(auth.uid(), society_id) OR public.is_security_officer(auth.uid(), society_id));
CREATE POLICY "Residents can insert authorized persons" ON public.authorized_persons FOR INSERT WITH CHECK (resident_id = auth.uid() AND society_id = public.get_user_society_id(auth.uid()));
CREATE POLICY "Residents can update their own authorized persons" ON public.authorized_persons FOR UPDATE USING (resident_id = auth.uid());
CREATE POLICY "Residents can delete their own authorized persons" ON public.authorized_persons FOR DELETE USING (resident_id = auth.uid());

-- RLS policies for campaigns
CREATE POLICY "Only admins can manage campaigns" ON public.campaigns FOR ALL USING (public.is_admin(auth.uid()));

-- RLS policies for collective_buy_requests
CREATE POLICY "Society members can view collective buy requests" ON public.collective_buy_requests FOR SELECT USING (society_id = public.get_user_society_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Society members can create collective buy requests" ON public.collective_buy_requests FOR INSERT WITH CHECK (created_by = auth.uid() AND society_id = public.get_user_society_id(auth.uid()));
CREATE POLICY "Authors can update collective buy requests" ON public.collective_buy_requests FOR UPDATE USING (created_by = auth.uid() OR public.is_society_admin(auth.uid(), society_id));

-- RLS policies for collective_buy_participants
CREATE POLICY "Society members can view participants" ON public.collective_buy_participants FOR SELECT USING (EXISTS (SELECT 1 FROM public.collective_buy_requests r WHERE r.id = request_id AND r.society_id = public.get_user_society_id(auth.uid())));
CREATE POLICY "Users can join collective buys" ON public.collective_buy_participants FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can leave collective buys" ON public.collective_buy_participants FOR DELETE USING (user_id = auth.uid());

-- RLS policies for delivery_partner_pool
CREATE POLICY "Society admins can manage delivery pool" ON public.delivery_partner_pool FOR ALL USING (public.is_society_admin(auth.uid(), society_id) OR public.is_admin(auth.uid()));
CREATE POLICY "Society members can view delivery pool" ON public.delivery_partner_pool FOR SELECT USING (society_id = public.get_user_society_id(auth.uid()));

-- RLS policies for job_tts_cache
CREATE POLICY "Authenticated can read job_tts_cache" ON public.job_tts_cache FOR SELECT USING (true);
CREATE POLICY "Admins can manage job_tts_cache" ON public.job_tts_cache FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- RLS policies for notification_preferences
CREATE POLICY "Users can view own notification preferences" ON public.notification_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own notification preferences" ON public.notification_preferences FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own notification preferences" ON public.notification_preferences FOR UPDATE USING (user_id = auth.uid());

-- RLS policies for price_history
CREATE POLICY "Sellers can view own price history" ON public.price_history FOR SELECT USING (EXISTS (SELECT 1 FROM public.products p JOIN public.seller_profiles sp ON sp.id = p.seller_id WHERE p.id = product_id AND sp.user_id = auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Sellers can insert price history" ON public.price_history FOR INSERT WITH CHECK (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.products p JOIN public.seller_profiles sp ON sp.id = p.seller_id WHERE p.id = product_id AND sp.user_id = auth.uid()));

-- RLS policies for push_logs
CREATE POLICY "Admins can view push logs" ON public.push_logs FOR ALL USING (public.is_admin(auth.uid()));

-- RLS policies for rate_limits
CREATE POLICY "System manages rate limits" ON public.rate_limits FOR ALL USING (public.is_admin(auth.uid()));

-- RLS policies for search_demand_log
CREATE POLICY "Admins can view search demand" ON public.search_demand_log FOR SELECT USING (public.is_admin(auth.uid()) OR public.is_society_admin(auth.uid(), society_id));
CREATE POLICY "Authenticated can insert search demand" ON public.search_demand_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS policies for seller_form_configs
CREATE POLICY "Anyone can read seller form configs" ON public.seller_form_configs FOR SELECT USING (true);
CREATE POLICY "Admins can manage seller form configs" ON public.seller_form_configs FOR ALL USING (public.is_admin(auth.uid()));

-- RLS policies for seller_reputation_ledger
CREATE POLICY "Sellers can view own reputation" ON public.seller_reputation_ledger FOR SELECT USING (EXISTS (SELECT 1 FROM public.seller_profiles sp WHERE sp.id = seller_id AND sp.user_id = auth.uid()) OR public.is_admin(auth.uid()));

-- RLS policies for seller_settlements
CREATE POLICY "Sellers can view own settlements" ON public.seller_settlements FOR SELECT USING (EXISTS (SELECT 1 FROM public.seller_profiles sp WHERE sp.id = seller_id AND sp.user_id = auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage settlements" ON public.seller_settlements FOR ALL USING (public.is_admin(auth.uid()));

-- RLS policies for society_budgets
CREATE POLICY "Society members can view budgets" ON public.society_budgets FOR SELECT USING (society_id = public.get_user_society_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Society admins can manage budgets" ON public.society_budgets FOR ALL USING (public.is_society_admin(auth.uid(), society_id));

-- RLS policies for society_features
CREATE POLICY "Anyone can read society features" ON public.society_features FOR SELECT USING (true);
CREATE POLICY "Admins can manage society features" ON public.society_features FOR ALL USING (public.is_admin(auth.uid()));

-- RLS policies for society_notices
CREATE POLICY "Society members can view notices" ON public.society_notices FOR SELECT USING (society_id = public.get_user_society_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Society admins can manage notices" ON public.society_notices FOR ALL USING (public.is_society_admin(auth.uid(), society_id));

-- RLS policies for society_report_cards
CREATE POLICY "Society members can view report cards" ON public.society_report_cards FOR SELECT USING (society_id = public.get_user_society_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage report cards" ON public.society_report_cards FOR ALL USING (public.is_admin(auth.uid()));

-- RLS policies for stock_watchlist
CREATE POLICY "Users can manage own watchlist" ON public.stock_watchlist FOR ALL USING (user_id = auth.uid());

-- RLS policies for worker_attendance (uses verified_by, not marked_by)
CREATE POLICY "Society members can view worker attendance" ON public.worker_attendance FOR SELECT USING (society_id = public.get_user_society_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Residents can mark worker attendance" ON public.worker_attendance FOR INSERT WITH CHECK (society_id = public.get_user_society_id(auth.uid()));

-- RLS policies for worker_leave_records
CREATE POLICY "Society members can view worker leaves" ON public.worker_leave_records FOR SELECT USING (EXISTS (SELECT 1 FROM public.society_workers w WHERE w.id = worker_id AND w.society_id = public.get_user_society_id(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Society admins can manage worker leaves" ON public.worker_leave_records FOR ALL USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.society_workers w WHERE w.id = worker_id AND public.is_society_admin(auth.uid(), w.society_id)));

-- RLS policies for worker_salary_records
CREATE POLICY "Society members can view salary records" ON public.worker_salary_records FOR SELECT USING (EXISTS (SELECT 1 FROM public.society_workers w WHERE w.id = worker_id AND (public.is_society_admin(auth.uid(), w.society_id) OR w.society_id = public.get_user_society_id(auth.uid()))) OR public.is_admin(auth.uid()));
CREATE POLICY "Society admins can manage salary records" ON public.worker_salary_records FOR ALL USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.society_workers w WHERE w.id = worker_id AND public.is_society_admin(auth.uid(), w.society_id)));