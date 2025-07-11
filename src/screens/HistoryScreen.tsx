import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import DrinkChart from '../components/DrinkChart';
import { analyticsService, ChartData, TimeRange } from '../services/analyticsService';
import { drinkService } from '../services/drinkService';
import { DrinkEntry } from '../types';
import ConfirmationPopup from '../components/ConfirmationPopup';

export default function HistoryScreen() {
 const [timeRange, setTimeRange] = useState<TimeRange>('week');
 const [chartData, setChartData] = useState<ChartData | null>(null);
 const [loading, setLoading] = useState(true);
 const isFocused = useIsFocused();

 // Historical editing state
 const [showEditModal, setShowEditModal] = useState(false);
 const [selectedDate, setSelectedDate] = useState(new Date());
 const [showDatePicker, setShowDatePicker] = useState(false);
 const [selectedDateEntries, setSelectedDateEntries] = useState<DrinkEntry[]>([]);
 const [editingEntry, setEditingEntry] = useState<DrinkEntry | null>(null);
 const [editTime, setEditTime] = useState(new Date());
 const [editCount, setEditCount] = useState('');
 const [showTimePicker, setShowTimePicker] = useState(false);
 const [newEntryCount, setNewEntryCount] = useState('');
 const [newEntryTime, setNewEntryTime] = useState(new Date());
 const [isPopupVisible, setPopupVisible] = useState(false);
 const [selectedEntry, setSelectedEntry] = useState<DrinkEntry | null>(null);

 useEffect(() => {
  if (isFocused) {
   loadData();
  }
 }, [timeRange, isFocused]);

 const loadData = async () => {
  try {
   setLoading(true);
   const data = await analyticsService.getDataForRange(timeRange);
   setChartData(data);
  } catch (error: any) {
   Alert.alert('Error', 'Failed to load chart data: ' + error.message);
  } finally {
   setLoading(false);
  }
 };

 const getTimeRangeTitle = (range: TimeRange): string => {
  switch (range) {
   case 'week':
    return 'Last 7 Days';
   case 'month':
    return 'Last 4 Weeks';
   case 'year':
    return 'Last 12 Months';
   default:
    return 'History';
  }
 };

 const getTimeRangeDescription = (range: TimeRange): string => {
  switch (range) {
   case 'week':
    return 'Daily consumption over the past week';
   case 'month':
    return 'Weekly totals over the past month';
   case 'year':
    return 'Monthly totals over the past year';
   default:
    return '';
  }
 };

 const openEditModal = async () => {
  setShowEditModal(true);
  // Always load entries for the current selected date when opening modal
  try {
   const dateString = selectedDate.toISOString().split('T')[0];
   const entries = await drinkService.getDrinksForDate(dateString);
   setSelectedDateEntries(entries);
  } catch (error: any) {
   Alert.alert('Error', error.message);
  }
 };

 const closeEditModal = () => {
  setShowEditModal(false);
  setEditingEntry(null);
  setEditCount('');
  setNewEntryCount('');
  setSelectedDateEntries([]);
  setShowDatePicker(false);
  setShowTimePicker(false);
  setPopupVisible(false);
  setSelectedEntry(null);
  setEditTime(new Date());
  setNewEntryTime(new Date());
 };

 const loadSelectedDateEntries = async () => {
  try {
   const dateString = selectedDate.toISOString().split('T')[0];
   const entries = await drinkService.getDrinksForDate(dateString);
   setSelectedDateEntries(entries);
  } catch (error: any) {
   Alert.alert('Error', error.message);
  }
 };

 const selectDate = async (event: any, date?: Date) => {
  if (Platform.OS === 'web') {
   // On web, event is the HTML input event
   const newDate = event.target ? new Date(event.target.value) : date;
   if (newDate && !isNaN(newDate.getTime())) {
        // Adjust for timezone offset to prevent date from changing
        const timezoneOffset = newDate.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(newDate.getTime() + timezoneOffset);

    setSelectedDate(adjustedDate);
    // Load entries for the newly selected date
    try {
     const dateString = adjustedDate.toISOString().split('T')[0];
     const entries = await drinkService.getDrinksForDate(dateString);
     setSelectedDateEntries(entries);
    } catch (error: any) {
     Alert.alert('Error', error.message);
    }
   }
  } else {
   // On iOS/Android, close the picker after selection
   setShowDatePicker(Platform.OS === 'ios'); // Keep iOS picker visible
   if (date) {
    setSelectedDate(date);
    // Load entries for the newly selected date
    try {
     const dateString = date.toISOString().split('T')[0];
     const entries = await drinkService.getDrinksForDate(dateString);
     setSelectedDateEntries(entries);
    } catch (error: any) {
     Alert.alert('Error', error.message);
    }
   }
  }
 };

 const startEditEntry = (entry: DrinkEntry) => {
  setEditingEntry(entry);
  setEditTime(new Date(entry.logged_at));
  setEditCount(entry.drink_count.toString());
 };

 const saveEditEntry = async () => {
  if (!editingEntry) return;
 
  const count = parseInt(editCount);
  if (isNaN(count) || count < 1) {
   Alert.alert('Error', 'Please enter a valid number of drinks (1 or more)');
   return;
  }

  try {
   await drinkService.updateDrinkEntry(editingEntry.id, {
    drink_count: count,
    logged_at: editTime.toISOString(),
   });
   setEditingEntry(null);
   setShowTimePicker(false);
   await loadSelectedDateEntries();
   await loadData(); // Refresh charts
  } catch (error: any) {
   Alert.alert('Error', error.message);
  }
 };

 const deleteEntry = (entry: DrinkEntry) => {
  setSelectedEntry(entry);
  setPopupVisible(true);
 };

 const handleConfirmDelete = async () => {
  if (!selectedEntry) return;

  try {
   await drinkService.deleteDrinkEntry(selectedEntry.id);
   await loadSelectedDateEntries();
   await loadData(); // Refresh charts
  } catch (error: any) {
   Alert.alert('Error', error.message);
  } finally {
   setPopupVisible(false);
   setSelectedEntry(null);
   setShowTimePicker(false); // Add this line
  }
 };

 const addNewEntry = async () => {
  const count = parseInt(newEntryCount);
  if (isNaN(count) || count < 1) {
   Alert.alert('Error', 'Please enter a valid number of drinks (1 or more)');
   return;
  }

  try {
   const dateString = selectedDate.toISOString().split('T')[0];
   const timeString = newEntryTime.toTimeString().slice(0, 5);
   await drinkService.addDrinkEntryForDate(count, dateString, timeString);
   setNewEntryCount('');
   setNewEntryTime(new Date());
   await loadSelectedDateEntries();
   await loadData(); // Refresh charts
  } catch (error: any) {
   Alert.alert('Error', error.message);
  }
 };

 return (
  <ScrollView style={styles.container}>
   <View style={styles.header}>
    <Text style={styles.title}>{getTimeRangeTitle(timeRange)}</Text>
    <Text style={styles.subtitle}>{getTimeRangeDescription(timeRange)}</Text>
   </View>

   <View style={styles.timeRangeSelector}>
    <TouchableOpacity
     style={[
      styles.timeRangeButton,
      timeRange === 'week' && styles.activeTimeRangeButton,
     ]}
     onPress={() => setTimeRange('week')}
    >
     <Text
      style={[
       styles.timeRangeButtonText,
       timeRange === 'week' && styles.activeTimeRangeButtonText,
      ]}
     >
      Week
     </Text>
    </TouchableOpacity>

    <TouchableOpacity
     style={[
      styles.timeRangeButton,
      timeRange === 'month' && styles.activeTimeRangeButton,
     ]}
     onPress={() => setTimeRange('month')}
    >
     <Text
      style={[
       styles.timeRangeButtonText,
       timeRange === 'month' && styles.activeTimeRangeButtonText,
      ]}
     >
      Month
     </Text>
    </TouchableOpacity>

    <TouchableOpacity
     style={[
      styles.timeRangeButton,
      timeRange === 'year' && styles.activeTimeRangeButton,
     ]}
     onPress={() => setTimeRange('year')}
    >
     <Text
      style={[
       styles.timeRangeButtonText,
       timeRange === 'year' && styles.activeTimeRangeButtonText,
      ]}
     >
      Year
     </Text>
    </TouchableOpacity>
   </View>

   <DrinkChart
    data={chartData || { labels: [], data: [] }}
    timeRange={timeRange}
    loading={loading}
   />

   {chartData && !loading && (
    <View style={styles.statsContainer}>
     <View style={styles.statCard}>
      <Text style={styles.statNumber}>
       {chartData.data.reduce((sum, val) => sum + val, 0)}
      </Text>
      <Text style={styles.statLabel}>
       Total {timeRange === 'week' ? 'Drinks' : timeRange === 'month' ? 'Drinks' : 'Drinks'}
      </Text>
     </View>

     <View style={styles.statCard}>
      <Text style={styles.statNumber}>
       {chartData.data.length > 0
        ? Math.round((chartData.data.reduce((sum, val) => sum + val, 0) / chartData.data.length) * 10) / 10
        : 0
       }
      </Text>
      <Text style={styles.statLabel}>
       Average per {timeRange === 'week' ? 'Day' : timeRange === 'month' ? 'Week' : 'Month'}
      </Text>
     </View>

     <View style={styles.statCard}>
      <Text style={styles.statNumber}>
       {Math.max(...(chartData.data.length > 0 ? chartData.data : [0]))}
      </Text>
      <Text style={styles.statLabel}>
       Peak {timeRange === 'week' ? 'Day' : timeRange === 'month' ? 'Week' : 'Month'}
      </Text>
     </View>
    </View>
   )}

   {/* Edit History Button */}
   <View style={styles.editHistorySection}>
    <TouchableOpacity style={styles.editHistoryButton} onPress={openEditModal}>
     <Text style={styles.editHistoryButtonText}>📅 Edit History</Text>
    </TouchableOpacity>
   </View>

   {/* Historical Edit Modal */}
   <Modal
    visible={showEditModal}
    transparent={true}
    animationType="slide"
    onRequestClose={closeEditModal}
   >
    <View style={styles.modalOverlay}>
     <ScrollView style={styles.modalScrollContainer} contentContainerStyle={styles.modalContent}>
      <Text style={styles.modalTitle}>Edit Historical Data</Text>
     
      {/* Date Selector */}
      <View style={styles.dateSection}>
       <Text style={styles.fieldLabel}>Select Date</Text>
          {Platform.OS === 'web' ? (
              <View style={styles.webDateInputContainer}>
                  <input
                      type="date"
                      value={selectedDate.toISOString().split('T')[0]}
                      onChange={selectDate}
                      max={new Date().toISOString().split('T')[0]}
                      style={{
                          width: '100%',
                          maxWidth: '100%',
                          boxSizing: 'border-box',
                          padding: '12px',
                          fontSize: '16px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          backgroundColor: '#f9f9f9',
                          color: '#2c3e50',
                      }}
                  />
              </View>
          ) : (
              <>
                  {/* For Android, show the button. For iOS, don't. */}
                  {Platform.OS !== 'ios' && (
                      <TouchableOpacity
                          style={styles.dateButton}
                          onPress={() => setShowDatePicker(true)}
                      >
                          <Text style={styles.dateButtonText}>
                              {selectedDate.toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                              })}
                          </Text>
                      </TouchableOpacity>
                  )}
                  {/* For iOS, show picker always. For Android, show on click */}
                  {(showDatePicker || Platform.OS === 'ios') && (
                      <View style={styles.iosDatePickerContainer}>
                          <DateTimePicker
                              value={selectedDate}
                              mode="date"
                              display="compact"
                              onChange={selectDate}
                              maximumDate={new Date()}
                              style={styles.iosDatePicker}
                          />
                      </View>
                  )}
              </>
          )}
      </View>

      {/* Existing Entries */}
      <View style={styles.entriesSection}>
       <Text style={styles.sectionLabel}>
        Entries for {selectedDate.toLocaleDateString()}
       </Text>
       {selectedDateEntries.length === 0 ? (
        <Text style={styles.noEntriesText}>No entries for this date</Text>
       ) : (
        <ScrollView style={styles.entriesList}>
         {selectedDateEntries.map((entry) => (
          <View key={entry.id} style={styles.entryItem}>
           <View style={styles.entryInfo}>
            <Text style={styles.entryCount}>{entry.drink_count} drink(s)</Text>
            <Text style={styles.entryTime}>
             {new Date(entry.logged_at).toLocaleTimeString()}
            </Text>
           </View>
           <View style={styles.entryActions}>
            <TouchableOpacity
             style={styles.editButton}
             onPress={() => startEditEntry(entry)}
            >
             <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
             style={styles.deleteButton}
             onPress={() => deleteEntry(entry)}
            >
             <Text style={styles.deleteButtonText}>Delete</Text>
             </TouchableOpacity>
           </View>
          </View>
         ))}
        </ScrollView>
       )}
      </View>

      {/* Add New Entry Section */}
      <View style={styles.addEntrySection}>
       <Text style={styles.sectionLabel}>Add New Entry</Text>
       <View style={styles.addEntryForm}>
        <View style={styles.formRow}>
         <View style={styles.countInput}>
          <Text style={styles.inputLabel}>Drinks</Text>
          <TextInput
           style={styles.numberInput}
           value={newEntryCount}
           onChangeText={setNewEntryCount}
           keyboardType="number-pad"
           placeholder="0"
          />
         </View>
         <View style={styles.timeInput}>
          <Text style={styles.inputLabel}>Time</Text>
          {Platform.OS === 'web' ? (
           <View style={styles.webDateInputContainer}>
             <input
                 type="time"
                 value={newEntryTime.toTimeString().slice(0, 5)}
                 onChange={(e) => {
                     const [hours, minutes] = e.target.value.split(':');
                     const newTime = new Date();
                     newTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                     setNewEntryTime(newTime);
                 }}
                 style={{
                     width: '100%',
                     maxWidth: '100%',
                     boxSizing: 'border-box',
                     padding: '12px',
                     fontSize: '16px',
                     border: '1px solid #ddd',
                     borderRadius: '6px',
                     backgroundColor: '#f9f9f9',
                     color: '#2c3e50',
                 }}
             />
           </View>
          ) : (
           <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowTimePicker(true)}
           >
             <Text style={styles.timeButtonText}>
                 {newEntryTime.toLocaleTimeString()}
             </Text>
           </TouchableOpacity>
          )}
         </View>
        </View>
       
        {Platform.OS !== 'web' && showTimePicker && (
         <DateTimePicker
          value={newEntryTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'compact' : 'default'}
          onChange={(event, time) => {
           setShowTimePicker(Platform.OS === 'ios');
           if (time) setNewEntryTime(time);
          }}
         />
        )}

        <TouchableOpacity style={styles.addButton} onPress={addNewEntry}>
         <Text style={styles.addButtonText}>Add Entry</Text>
        </TouchableOpacity>
       </View>
      </View>

      {/* Modal Actions - Fixed at bottom */}
      <View style={styles.modalActions}>
       <TouchableOpacity style={styles.closeButton} onPress={closeEditModal}>
        <Text style={styles.closeButtonText}>Done</Text>
       </TouchableOpacity>
      </View>
     </ScrollView>
    </View>
   </Modal>

   {/* Edit Entry Modal */}
   {editingEntry && (
    <Modal
     visible={editingEntry !== null}
     transparent={true}
     animationType="slide"
     onRequestClose={() => setEditingEntry(null)}
    >
     <View style={styles.modalOverlay}>
      <View style={styles.editModalContent}>
       <Text style={styles.modalTitle}>Edit Entry</Text>
      
       <View style={styles.editField}>
        <Text style={styles.fieldLabel}>Number of Drinks</Text>
        <TextInput
         style={styles.editInput}
         value={editCount}
         onChangeText={setEditCount}
         keyboardType="number-pad"
         placeholder="Enter number of drinks"
        />
       </View>

       <View style={styles.editField}>
        <Text style={styles.fieldLabel}>Time</Text>
        {Platform.OS === 'web' ? (
         <View style={styles.webDateInputContainer}>
          <input
           type="time"
           value={editTime.toTimeString().slice(0, 5)}
           onChange={(e) => {
            const [hours, minutes] = e.target.value.split(':');
            const newTime = new Date(editTime);
            newTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            setEditTime(newTime);
           }}
           style={{
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            padding: '12px',
            fontSize: '16px',
             border: '1px solid #ddd',
             borderRadius: '6px',
             backgroundColor: '#f9f9f9',
             color: '#2c3e50',
           }}
          />
         </View>
        ) : (
         <TouchableOpacity
          style={styles.timeButton}
          onPress={() => setShowTimePicker(true)}
         >
          <Text style={styles.timeButtonText}>
           {editTime.toLocaleTimeString()}
          </Text>
         </TouchableOpacity>
        )}
       </View>

       <View style={styles.modalButtons}>
        <TouchableOpacity
         style={styles.cancelButton}
         onPress={() => setEditingEntry(null)}
        >
         <Text style={styles.cancelButtonText}>Cancel</Text>
         </TouchableOpacity>
         <TouchableOpacity
             style={styles.saveButton}
             onPress={saveEditEntry}
         >
             <Text style={styles.saveButtonText}>Save</Text>
         </TouchableOpacity>
       </View>
      </View>
     </View>
    </Modal>
   )}

   <ConfirmationPopup
    visible={isPopupVisible}
    onConfirm={handleConfirmDelete}
    onCancel={() => setPopupVisible(false)}
    title="Delete Entry"
    message={`Are you sure you want to delete ${selectedEntry?.drink_count} drink(s)?`}
   />
  </ScrollView>
 );
}

const styles = StyleSheet.create({
 container: {
  flex: 1,
  backgroundColor: '#f5f5f5',
 },
 header: {
  padding: 20,
  backgroundColor: 'white',
  borderBottomWidth: 1,
  borderBottomColor: '#ddd',
 },
 title: {
  fontSize: 24,
  fontWeight: 'bold',
  color: '#2c3e50',
 },
 subtitle: {
  fontSize: 16,
  color: '#7f8c8d',
  marginTop: 5,
 },
 timeRangeSelector: {
  flexDirection: 'row',
  padding: 20,
  gap: 10,
 },
 timeRangeButton: {
  flex: 1,
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 8,
   borderWidth: 1,
   borderColor: '#3498db',
   backgroundColor: 'white',
   alignItems: 'center',
 },
 activeTimeRangeButton: {
   backgroundColor: '#3498db',
 },
 timeRangeButtonText: {
   fontSize: 16,
   fontWeight: '500',
   color: '#3498db',
 },
 activeTimeRangeButtonText: {
   color: 'white',
 },
 statsContainer: {
   flexDirection: 'row',
   padding: 20,
   gap: 15,
 },
 statCard: {
   flex: 1,
   backgroundColor: 'white',
   padding: 15,
   borderRadius: 12,
   alignItems: 'center',
   shadowColor: '#000',
   shadowOffset: { width: 0, height: 2 },
   shadowOpacity: 0.1,
   shadowRadius: 4,
   elevation: 3,
 },
 statNumber: {
   fontSize: 24,
   fontWeight: 'bold',
   color: '#3498db',
 },
 statLabel: {
   fontSize: 12,
   color: '#7f8c8d',
   marginTop: 5,
   textAlign: 'center',
 },
 editHistorySection: {
   padding: 20,
 },
 editHistoryButton: {
   backgroundColor: '#3498db',
   padding: 15,
   borderRadius: 8,
   alignItems: 'center',
 },
 editHistoryButtonText: {
   color: 'white',
   fontSize: 16,
   fontWeight: 'bold',
 },
 modalOverlay: {
   flex: 1,
   backgroundColor: 'rgba(0, 0, 0, 0.5)',
   justifyContent: 'center',
   alignItems: 'center',
 },
 modalScrollContainer: {
   width: '90%',
   maxWidth: 500,
   maxHeight: '85%',
   backgroundColor: 'white',
   borderRadius: 12,
 },
 modalContent: {
   padding: 20,
   flexGrow: 1,
 },
 modalTitle: {
   fontSize: 18,
   fontWeight: 'bold',
   color: '#2c3e50',
   marginBottom: 20,
   textAlign: 'center',
 },
 dateSection: {
   marginBottom: 15,
 },
 webDateInputContainer: {
   width: '100%',
   maxWidth: '100%',
   overflow: 'hidden',
 },
 modalScrollView: {
   flex: 1,
   paddingHorizontal: 0,
 },
 fieldLabel: {
   fontSize: 14,
   color: '#7f8c8d',
   marginBottom: 5,
   fontWeight: '600',
 },
 dateButton: {
   borderWidth: 1,
   borderColor: '#ddd',
   borderRadius: 6,
   padding: 12,
   backgroundColor: '#f9f9f9',
 },
 dateButtonText: {
   fontSize: 16,
   color: '#2c3e50',
 },
 iosDatePickerContainer: {
   backgroundColor: '#f8f9fa',
   borderRadius: 8,
   marginBottom: 15,
   paddingVertical: 10,
 },
 iosDatePicker: {
   height: 120,
 },
 entriesSection: {
   marginBottom: 15,
 },
 entriesList: {
   maxHeight: 200,
   marginBottom: 10,
 },
 sectionLabel: {
   fontSize: 16,
   fontWeight: 'bold',
   color: '#2c3e50',
   marginBottom: 10,
 },
 noEntriesText: {
   fontSize: 14,
   color: '#7f8c8d',
   textAlign: 'center',
   padding: 15,
   fontStyle: 'italic',
 },
 entryItem: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   alignItems: 'center',
   backgroundColor: '#f8f9fa',
   padding: 12,
   borderRadius: 8,
   marginBottom: 8,
 },
 entryInfo: {
   flex: 1,
 },
 entryCount: {
   fontSize: 16,
   fontWeight: 'bold',
   color: '#2c3e50',
 },
 entryTime: {
   fontSize: 14,
   color: '#7f8c8d',
   marginTop: 2,
 },
 entryActions: {
   flexDirection: 'row',
   gap: 8,
 },
 editButton: {
   backgroundColor: '#3498db',
   paddingHorizontal: 12,
   paddingVertical: 6,
   borderRadius: 4,
 },
 editButtonText: {
   color: 'white',
   fontSize: 12,
   fontWeight: 'bold',
 },
 deleteButton: {
   backgroundColor: '#e74c3c',
   paddingHorizontal: 12,
   paddingVertical: 6,
   borderRadius: 4,
 },
 deleteButtonText: {
   color: 'white',
   fontSize: 12,
   fontWeight: 'bold',
 },
 addEntrySection: {
   marginBottom: 10,
 },
 addEntryForm: {
   gap: 10,
 },
 formRow: {
   flexDirection: 'row',
   gap: 10,
   width: '100%',
 },
 countInput: {
   flex: 1,
   minWidth: 0,
 },
 timeInput: {
   flex: 2,
   minWidth: 0,
 },
 inputLabel: {
   fontSize: 14,
   color: '#7f8c8d',
   marginBottom: 5,
   fontWeight: '600',
 },
 numberInput: {
   borderWidth: 1,
   borderColor: '#ddd',
   borderRadius: 6,
   padding: 12,
   fontSize: 16,
   backgroundColor: '#f9f9f9',
   textAlign: 'center',
   width: '100%',
   maxWidth: '100%',
 },
 timeButton: {
   borderWidth: 1,
   borderColor: '#ddd',
   borderRadius: 6,
   padding: 12,
   backgroundColor: '#f9f9f9',
   width: '100%',
   maxWidth: '100%',
 },
 timeButtonText: {
   fontSize: 16,
   color: '#2c3e50',
 },
 addButton: {
   backgroundColor: '#27ae60',
   padding: 12,
   borderRadius: 6,
   alignItems: 'center',
 },
 addButtonText: {
   color: 'white',
   fontSize: 16,
   fontWeight: 'bold',
 },
 modalActions: {
   borderTopWidth: 1,
   borderTopColor: '#eee',
   paddingTop: 15,
 },
 closeButton: {
   backgroundColor: '#95a5a6',
   padding: 12,
   borderRadius: 6,
   alignItems: 'center',
 },
 closeButtonText: {
   color: 'white',
   fontSize: 16,
   fontWeight: 'bold',
 },
 editModalContent: {
   backgroundColor: 'white',
   borderRadius: 12,
   padding: 20,
   width: '80%',
   maxWidth: 300,
 },
 editField: {
   marginBottom: 15,
 },
 editInput: {
   borderWidth: 1,
   borderColor: '#ddd',
   borderRadius: 6,
   padding: 12,
   fontSize: 16,
   backgroundColor: '#f9f9f9',
 },
 modalButtons: {
   flexDirection: 'row',
   gap: 10,
   marginTop: 20,
 },
 cancelButton: {
   flex: 1,
   padding: 12,
   backgroundColor: '#95a5a6',
   borderRadius: 6,
   alignItems: 'center',
 },
 saveButton: {
   flex: 1,
   padding: 12,
   backgroundColor: '#27ae60',
   borderRadius: 6,
   alignItems: 'center',
 },
 cancelButtonText: {
   color: 'white',
   fontWeight: 'bold',
 },
 saveButtonText: {
   color: 'white',
   fontWeight: 'bold',
 },
});
