import {
    calculateAdexAnthropometry,
    createAdexAnthropometry,
    getAdexAnthropometriesByAthleteId,
    getAdexAnthropometryById,
    getBiaMeasurementsByAthleteId,
    getAnthropometryBySessionId,
    patchAnthropometryBySessionId,
  } from "./services.js";


  export async function calculateAdexAnthropometryData(req, res, next) {
    try {
      const data = await calculateAdexAnthropometry(req.params.athleteId, req.body);
      return res.status(200).json({ data });
    } catch (err) {
      return next(err);
    }
  }


  export async function createAdexAnthropometryData(req, res, next) {
    try {
      const data = await createAdexAnthropometry(req.params.athleteId, req.body);
      return res.status(201).json({ data });
    } catch (err) {
      return next(err);
    }
  }


  export async function getBiaMeasurements(req, res, next) {
    try {
      const data = await getBiaMeasurementsByAthleteId(req.params.athleteId);
      return res.status(200).json({ data });
    } catch (err) {
      return next(err);
    }
  }


  export async function getAdexAnthropometries(req, res, next) {
    try {
      const data = await getAdexAnthropometriesByAthleteId(req.params.athleteId);
      return res.status(200).json({ data });
    } catch (err) {
      return next(err);
    }
  }


  export async function getAdexAnthropometryDetail(req, res, next) {
    try {
      const data = await getAdexAnthropometryById(req.params.anthropometryId);
      return res.status(200).json({ data });
    } catch (err) {
      return next(err);
    }
  }
 
  export async function getAnthropometry(req, res, next) {
    try {
      const { sessionId } = req.params;
      const data = await getAnthropometryBySessionId(sessionId);
      return res.status(200).json({ data });
    } catch (err) {
      return next(err);
    }
  }
 
  export async function patchAnthropometry(req, res, next) {
    try {
      const { sessionId } = req.params;
      const payload = req.body;
      const data = await patchAnthropometryBySessionId(sessionId, payload, req.user.userId);
      return res.status(200).json({ data });
    } catch (err) {
      return next(err);
    }
  }
