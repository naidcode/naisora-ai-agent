const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Database wrapper for Naisora AI Agent
 */
const db = {
  leads: {
    async find(id) {
      const { data, error } = await supabase
        .from('leads_v2')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
        console.error('Error finding lead:', error);
      }
      return data;
    },

    async insert(lead) {
      const { data, error } = await supabase
        .from('leads_v2')
        .insert(lead);
      
      if (error) {
        console.error('Error inserting lead:', error);
        throw error;
      }
      return data;
    },

    async update(id, updates) {
      const { data, error } = await supabase
        .from('leads_v2')
        .update(updates)
        .eq('id', id);
      
      if (error) {
        console.error('Error updating lead:', error);
        throw error;
      }
      return data;
    },

    async findSimilar(lead) {
      const { data, error } = await supabase
        .from('leads_v2')
        .select('*')
        .filter('name', 'ilike', `%${lead.name}%`)
        .filter('address', 'ilike', `%${lead.address || ''}%`)
        .limit(1);
      
      if (error) {
        console.error('Error finding similar lead:', error);
        return null;
      }
      return data && data.length > 0 ? data[0] : null;
    },

    async count(filters = {}) {
      let query = supabase.from('leads_v2').select('*', { count: 'exact', head: true });
      
      if (filters.contacted !== undefined) {
        query = query.eq('contacted', filters.contacted);
      }
      if (filters.since) {
        query = query.gte('lastContactedAt', filters.since);
      }
      if (filters.contactChannel) {
        query = query.eq('contactChannel', filters.contactChannel);
      }

      const { count, error } = await query;
      if (error) {
        console.error('Error counting leads:', error);
        return 0;
      }
      return count;
    }
  },

  conversations: {
    async findByLead(leadId) {
      const { data, error } = await supabase
        .from('conversations_v2')
        .select('*')
        .eq('leadId', leadId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error finding conversation:', error);
      }
      return data;
    },

    async getHistory(leadId) {
      const { data, error } = await supabase
        .from('conversations_v2')
        .select('lastMessage')
        .eq('leadId', leadId);
      
      if (error) return [];
      return data.map(d => d.lastMessage);
    },

    async insert(convo) {
      const { data, error } = await supabase
        .from('conversations_v2')
        .insert(convo);
      
      if (error) {
        console.error('Error inserting conversation:', error);
        throw error;
      }
      return data;
    },

    async update(id, updates) {
      const { data, error } = await supabase
        .from('conversations_v2')
        .update(updates)
        .eq('id', id);
      
      if (error) {
        console.error('Error updating conversation:', error);
        throw error;
      }
      return data;
    },

    async count(filters = {}) {
      let query = supabase.from('conversations_v2').select('*', { count: 'exact', head: true });
      
      if (filters.isAutoReply !== undefined) {
        query = query.eq('isAutoReply', filters.isAutoReply);
      }
      if (filters.isClosed !== undefined) {
        query = query.eq('isClosed', filters.isClosed);
      }

      const { count, error } = await query;
      if (error) {
        console.error('Error counting conversations:', error);
        return 0;
      }
      return count;
    }
  },

  errors: {
    async upsert(errorLog) {
      // Find existing error first to increment count
      const { data: existing } = await supabase
        .from('errors_v2')
        .select('*')
        .eq('module', errorLog.module)
        .eq('message', errorLog.message)
        .single();

      if (existing) {
        return await supabase
          .from('errors_v2')
          .update({ 
            occurrenceCount: existing.occurrenceCount + 1,
            lastOccurrenceAt: new Date()
          })
          .eq('id', existing.id);
      } else {
        return await supabase
          .from('errors_v2')
          .insert({
            ...errorLog,
            occurrenceCount: 1,
            lastOccurrenceAt: new Date()
          });
      }
    },

    async getFrequency(moduleName, message, withinMinutes = 10) {
      const since = new Date(Date.now() - withinMinutes * 60000).toISOString();
      const { data, error } = await supabase
        .from('errors_v2')
        .select('occurrenceCount')
        .eq('module', moduleName)
        .eq('message', message)
        .gte('lastOccurrenceAt', since)
        .single();
      
      if (error) return 0;
      return data ? data.occurrenceCount : 0;
    },

    async count(filters = {}) {
      let query = supabase.from('errors_v2').select('*', { count: 'exact', head: true });
      
      if (filters.resolved !== undefined) {
        query = query.eq('resolved', filters.resolved);
      }

      const { count, error } = await query;
      if (error) {
        console.error('Error counting errors:', error);
        return 0;
      }
      return count;
    }
  }
};

/**
 * Utility to hash name + phone/email
 */
function hash(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

module.exports = {
  db,
  hash
};
