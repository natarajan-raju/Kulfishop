import React, { useRef } from 'react';
import { View, Button } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

const Confetti = () => {
  const confettiRef = useRef(null);
  const [show, setShow] = React.useState(false);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button
        title="Celebrate 🎉"
        onPress={() => setShow(true)}
      />

      {show && (
        <ConfettiCannon
          count={150}
          origin={{ x: -10, y: 0 }}
          autoStart={true}
          fadeOut={true}
          explosionSpeed={300}
          fallSpeed={3000}
          onAnimationEnd={() => setShow(false)}
        />
      )}
    </View>
  );
};

export default Confetti;
