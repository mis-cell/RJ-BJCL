import rawData from './areaLogicMasterData.json';

// Auto-generated master dataset for Area-Agency mappings (area_logic)
export interface AreaLogicRecord {
  AREA_CODE: string;
  AREA_NAME: string;
  AGENCY_CODE: string;
  AGENCY_NAME: string;
}

export const AREA_LOGIC_MASTER_DATA: AreaLogicRecord[] = rawData as AreaLogicRecord[];
