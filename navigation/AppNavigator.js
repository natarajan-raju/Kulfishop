import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import InventoryScreen from '../screens/InventoryScreen';
import CartScreen from '../screens/CartScreen';
import OperationsScreen from '../screens/OperationsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ReminderScreen from '../screens/ReminderScreen';



import { MaterialCommunityIcons } from '@expo/vector-icons';


const Tab = createBottomTabNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#d90368',
          tabBarInactiveTintColor: '#311847',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopColor: '#311847',
            borderTopWidth: 1,
          },
        }}
      >        
        <Tab.Screen
          name="Home"
          component={InventoryScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="warehouse" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Carts"
          component={CartScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="cart" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Operations"
          component={OperationsScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="sync" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Reports"
          component={ReportsScreen}
          options={{
            tabBarLabel: 'Reports',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="file-chart" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Reminders"
          component={ReminderScreen}
          options={{
            tabBarLabel: 'Reminders',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="store-clock" size={size} color={color} />
            ),
          }}
        />

      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;



// import React from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import { createStackNavigator } from '@react-navigation/stack';
// import InventoryScreen from '../screens/InventoryScreen';

// const Stack = createStackNavigator();

// const AppNavigator = () => {
//   return (
//     <NavigationContainer>
//       <Stack.Navigator
//         initialRouteName="Inventory"
//         screenOptions={{
//           headerStyle: {
//             backgroundColor: '#007aff',
//           },
//           headerTintColor: '#fff',
//           headerTitleStyle: {
//             fontWeight: 'bold',
//           },
//         }}
//       >
//         <Stack.Screen
//           name="Inventory"
//           component={InventoryScreen}
//           options={{ title: 'Warehouse Inventory' }}
//         />
//         {/* Add additional screens here */}
//       </Stack.Navigator>
//     </NavigationContainer>
//   );
// };

// export default AppNavigator;
